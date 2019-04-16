"""Bartlett's transmission chain experiment from Remembering (1932)."""

import logging
import json

from operator import attrgetter

from dallinger.experiment import Experiment
from dallinger.nodes import Source
from dallinger.models import Info, Node, Network


logger = logging.getLogger(__file__)

class Bartlett1932(Experiment):
    """Define the structure of the experiment."""

    def __init__(self, session=None):
        """Call the same function in the super (see experiments.py in dallinger).

        The models module is imported here because it must be imported at
        runtime.

        A few properties are then overwritten.

        Finally, setup() is called.
        """
        self.group_size = 2
        super(Bartlett1932, self).__init__(session)
        import models
        self.models = models

        self.known_classes["LottyInfo"] = self.models.LottyInfo
        self.known_classes["LottyNode"] = self.models.LottyNode
        self.known_classes["QuizSource"] = self.models.QuizSource
        self.experiment_repeats = 2
        self.initial_recruitment_size = self.experiment_repeats*self.group_size
        if session:
            self.setup()

    @property
    def public_properties(self):
        return {
            'group_size': self.group_size
        }


    def setup(self):
        """Setup the networks.

        Setup only does stuff if there are no networks, this is so it only
        runs once at the start of the experiment. It first calls the same
        function in the super (see experiments.py in dallinger). Then it adds a
        source to each network.
        """
        if not self.networks():
            super(Bartlett1932, self).setup()
            for net in self.networks():
                self.models.QuizSource(network=net)

    def set_condition(self):
        conditions = ["A"]
        return conditions[(self.experiment_repeats - 1) % len(conditions)]            


    def create_network(self):
        """Return a new network."""
        return Star(max_size=self.group_size+1)


    def create_node(self, participant, network):
        """Create a node for a participant."""
        node = self.models.LottyNode(network=network, participant=participant)
        import random
        name = random.randint(100, 999)
        #name is then assigned to node's property1 in the database
        node.property1 = json.dumps({
            'name': name,
            'n_copies': 0,
            'asoc_score': 0,
            'score': 0,
            'bonus': False,
            'n_requests': 0,
            'condition': self.set_condition()
        })
        return node


    def get_network_for_participant(self, participant):
        if participant.nodes(failed="all"):
            return None

        networks = self.networks(full=False)
        if networks:
            return min(networks, key=attrgetter("id"))
        else:
            return None


    def add_node_to_network(self, node, network):
        """Add node to the chain and receive transmissions."""
        network.add_node(node)
        source = node.neighbors(type=Source, direction="from")[0]
        if network.full:
            source.transmit()


    def info_post_request(self, node, info):
        """Run when a request to create an info is complete."""
        self.reset_request_counters(node.network)

        
        # Process info, copying as necessary and updating scores.
        if info.copying:
            info = self.copy_neighbor(node, info)
        else:
            if info.round == 1:
                # update node property3 which is the asocial score in round 1
                node.asoc_score = node.asoc_score + info.score
                self.save()

        # as long as its not a practice question update total score.
        if info.round != 0:
            node.score = node.score + info.score
            self.save()
        
        self.update_node_bonus(node)

        self.advance_group(node, info)
        

    def advance_group(self, node, info):
        # Check to see if the source needs to send anything out.
        group = node.network.nodes(type=self.models.LottyNode)
        group.sort(key=attrgetter("id"))
        other_nodes = [n for n in group if n.id != node.id]
        group_infos = [i for i in node.network.infos(type=self.models.LottyInfo) if i.number == info.number]
        group_infos.sort(key=attrgetter("origin_id"))
        group_answers = [i.contents for i in group_infos]
        import json
        q = node.network.nodes(type=self.models.QuizSource)[0]
        q = q.infos()
        q = [i for i in q if i.contents not in ["Good Luck", "Bad Luck"]]
        q = max(q, key=attrgetter('id'))
        q = q.contents
        q = json.loads(q)
        Rwer = q["Rwer"]
        Wwer = q["Wwer"]

        if self.everyone_waiting(group_infos, info, group_answers, Rwer, Wwer):
            # if everyone copied
            if all([a == "Ask Someone Else" for a in group_answers]):
                self.notify_bad_luck(group_infos)

            # if no-one copied
            elif not "Ask Someone Else" in group_answers:
                self.send_next_question(node.network)
                
            # if some copied
            else:
                self.notify_good_luck(group, group_infos, group_answers)


    def everyone_waiting(self, group_infos, info, group_answers, Rwer, Wwer):
        # is everyone waiting for the server to do something?
        # only return true if everyone has answered and the current
        # answer is the last in the group.
        everyone_answered = len(group_infos) == (info.network.size() - 1)
        if not everyone_answered:
            return False

        if all([a in [Rwer, Wwer, "Ask Someone Else", "Bad Luck"] for a in group_answers]):
            if info == max(group_infos, key=attrgetter("id")):
                return True
        
        return False


    def copy_neighbor(self, node, info):
        # Find the neighbor
        neighbors = [n for n in node.network.nodes(type=self.models.LottyNode) if n.id != node.id]
        neighbor = [n for n in neighbors if n.id == int(info.contents)][0]

        # increase their number of copies, but only if we're in round 1
        if info.round == 1:
            self.log("incremementing n_copies of node {}, from {} to {}".format(neighbor.id, neighbor.n_copies, neighbor.n_copies + 1))
            neighbor.n_copies = neighbor.n_copies + 1
            self.save()
            self.log("n_copies of node {} has been incremented, its now {}".format(neighbor.id, neighbor.n_copies))

        # fail the original info
        info.fail()
        
        # ask the neighbor to transmit their actual decision to the current player.
        copied_info = max(neighbor.infos(), key=attrgetter("id"))
        neighbor.transmit(what=copied_info, to_whom=node)
        
        # the current player receives it and copies it.
        node.receive()
        node.replicate(info_in=copied_info)
        
        # get the newly made info, and copy its properties over as well.
        new_info = max(node.infos(), key=attrgetter("id"))
        new_info.property1 = copied_info.property1
        new_info.copying = info.copying
        new_info.info_chosen = info.info_chosen

        return new_info


    def update_node_bonus(self, node):
        # update the nodes bonus
        node.bonus = node.score >= 85

        # add node properties 4 and 5 to ppt object
        ppt = node.participant
        ppt.property1 = node.score
        ppt.property2 = node.bonus


    def notify_bad_luck(self, infos):
        for i in infos:
            i.fail()

        source = infos[0].network.nodes(type=Source)[0]
        source.transmit(what=Info(origin=source, contents="Bad Luck"))


    def send_next_question(self, network):
        # delete all old vectors
        source = network.nodes(type=Source)[0]
        vectors = network.vectors()
        for v in vectors:
            if v.origin_id != source.id:
                v.fail()
        
        #then get the source to transmit to all of its neighbors
        source.transmit()


    def notify_good_luck(self, nodes, group_infos, answers):
        copiers = [n for n, a in zip(nodes, answers) if a == "Ask Someone Else"]
        not_copiers = [n for n, a in zip(nodes, answers) if a != "Ask Someone Else"]
        for i in group_infos:
            if i.contents == "Ask Someone Else":
                i.fail()

        for n in not_copiers:
            #connect the not copiers to the copiers
            n.connect(whom=copiers)

        source = nodes[0].network.nodes(type=Source)[0]
        source.transmit(what=Info(origin=source, contents="Good Luck"), to_whom=copiers)


    def recruit(self):
        """Recruit one participant at a time until all networks are full."""
        if self.networks(full=False):
            self.recruiter().recruit(n=1)

        else:
            self.recruiter().close_recruitment()
    
    def bonus(self, participant):
        """Calculate a participants bonus."""
        nodes = participant.nodes()
        if len(nodes) != 1:
            return 0

        node = nodes[0]
        bonus = node.bonus
        if (bonus == True):
            return 20
        else:
            return 0

    def transmission_get_request(self, node, transmissions):
        """Run when a request to get transmissions is complete."""
        if node.network.full:
            node.n_requests = node.n_requests + 1
            self.save()

            if node.n_requests > 60:
                self.check_node_activity(node)


    def check_node_activity(self, node):
        nodes = node.network.nodes(type=self.models.LottyNode)
        requests = [n.n_requests for n in nodes]
        max_requests = max(requests)

        players = [n for n in nodes if max_requests - n.n_requests < 30]
        abandoners = [n for n in nodes if max_requests - n.n_requests >= 30]

        player_ids = [n.id for n in players]
        max_player_id = max(player_ids)

        if node.id == max_player_id:
            for a in abandoners:
                a.network.max_size = a.network.max_size - 1
                a.fail()
            
            self.reset_request_counters(node.network)
            most_recent_info = max(node.network.infos(type=self.models.LottyInfo), key=attrgetter("id"))
            self.advance_group(most_recent_info.origin, most_recent_info)


    def reset_request_counters(self, network):
        nodes = network.nodes(type=self.models.LottyNode)
        for n in nodes:
            n.n_requests = 0



class Star(Network):
    """A star network.

    A star newtork has a central node with a pair of vectors, incoming and
    outgoing, with all other nodes.
    """

    __mapper_args__ = {"polymorphic_identity": "star"}

    def add_node(self, node):
        """Add a node and connect it to the center."""
        nodes = self.nodes()

        if len(nodes) > 1:
            first_node = min(nodes, key=attrgetter('creation_time'))
            if isinstance(first_node, Source):
                first_node.connect(direction="to", whom=node)
            else:
                first_node.connect(direction="both", whom=node)

