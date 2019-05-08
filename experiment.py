"""Bartlett's transmission chain experiment from Remembering (1932)."""

import logging
import json

from operator import attrgetter

from dallinger.experiment import Experiment
from dallinger.nodes import Source
from dallinger.models import Info, Node


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
        self.group_size = 10
        super(Bartlett1932, self).__init__(session)
        import models
        self.models = models

        self.known_classes["LottyInfo"] = self.models.LottyInfo
        self.known_classes["LottyNode"] = self.models.LottyNode
        self.known_classes["QuizSource"] = self.models.QuizSource
        self.experiment_repeats = 2
        self.initial_recruitment_size = int(self.experiment_repeats*self.group_size*1.3)
        if session:
            self.setup()

    @property
    def public_properties(self):
        return {
            'group_size': self.group_size,
            'condition': "A"
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


    def create_network(self):
        """Return a new network."""
        return self.models.LottyStar(max_size=self.group_size+1)


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
            'n_requests': 0
        })
        node.property2 = self.public_properties["condition"]
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
        if info.copying:
            info = self.copy_neighbor(node, info)
        else:
            # update node asoc score in round 1
            if info.round == 1:
                node.asoc_score = node.asoc_score + info.score

        # as long as its not a practice question update total score.
        if info.round != 0:
            node.score = node.score + info.score

        self.update_node_bonus(node)

        group = node.network.nodes(type=self.models.LottyNode)
        infos = []
        for g in group:
            if g.infos():
                infos.append(max(g.infos(), key=attrgetter("id")))
        if self.group_ready_to_advance(info, infos):
            self.advance_group(group, infos);


    def group_ready_to_advance(self, info, infos):
        # the network is ready to advance only if:
        # 1 - every node has at least 1 info
        # 2 - everyone's most recent info is from the same question
        # 3 - the current submitter is the most recent of these
        return (
            len(infos) == info.network.size() - 1 and
            len(set([i.number for i in infos])) == 1 and
            info.id == max([i.id for i in infos])
        )


    def advance_group(self, group, infos):
        answers = [i.contents for i in infos]

        # if everyone copied
        if all([a == "Ask Someone Else" for a in answers]):
            self.notify_bad_luck(infos)

        # if no-one copied
        elif not "Ask Someone Else" in answers:
            self.send_next_question(group[0].network)
            
        # if some copied
        else:
            self.notify_good_luck(group, infos, answers)


    def copy_neighbor(self, node, info):
        # Find the neighbor
        neighbor = [n for n in node.network.nodes(type=self.models.LottyNode) if n.id == int(info.contents)][0]

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

        # add node properties to ppt object
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
        for v in network.vectors():
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


