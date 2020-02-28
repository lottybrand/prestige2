"""Bartlett's transmission chain experiment from Remembering (1932)."""

import logging
import json

from operator import attrgetter
from datetime import datetime

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
        self.group_size = 3
        super(Bartlett1932, self).__init__(session)
        import models
        self.models = models

        self.known_classes["LottyInfo"] = self.models.LottyInfo
        self.known_classes["LottyNode"] = self.models.LottyNode
        self.known_classes["QuizSource"] = self.models.QuizSource
        self.experiment_repeats = 1
        self.initial_recruitment_size = int(self.experiment_repeats*self.group_size)
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
            'n_copies_geog':0,
            'n_copies_weight':0,
            'n_copies_lang':0,
            'n_copies_art':0,
            'asoc_score': 0,
            'asoc_score_geog':0,
            'asoc_score_weight':0,
            'asoc_score_lang':0,
            'asoc_score_art':0,
            'score': 0,
            'bonus': False,
            'last_request': str(datetime.now())
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
        node.last_request = datetime.now()

        if info.copying:
            info = self.copy_neighbor(node, info)
        else:
            if info.round == 1:
                node.asoc_score = node.asoc_score + info.score
                if info.topic == "Geography":
                    node.asoc_score_geog = node.asoc_score_geog + info.score
                elif info.topic == "Weight":
                    node.asoc_score_weight = node.asoc_score_weight + info.score
                elif info.topic == "Language":
                    node.asoc_score_lang = node.asoc_score_lang + info.score
                elif info.topic == "Art":
                    node.asoc_score_art = node.asoc_score_art + info.score
        # as long as its not a practice question update total score.
        if info.round != 0:
            node.score = node.score + info.score

        self.update_node_bonus(node)

        group = node.network
        if self.group_ready_to_advance(group):
            if node == self.group_leader(group):
                self.advance_group(group)


    def group_leader(self, network):
        # returns the node in the network that most recently created an info
        infos = network.infos(type=self.models.LottyInfo)
        if infos:
            return max(infos, key=attrgetter("id")).origin
        else:
            return None



    def group_ready_to_advance(self, network):
        # the network is ready to advance only if:
        # 1 - every node has at least 1 info
        # 2 - everyone's most recent info is from the same question
        # 3 - everyone's info is an actual answer, not just saying who to copy

        # work out the Rwer and Wwer
        import json
        questions = [
            i for i in network.nodes(type=self.models.QuizSource)[0].infos()
            if i.contents not in ["Good Luck", "Bad Luck"]
        ]
        if not questions:
            return False
        question = json.loads(max(questions, key=attrgetter('id')).contents)
        Rwer = question["Rwer"]
        Wwer = question["Wwer"]

        # get the current group answers
        group = network.nodes(type=self.models.LottyNode)
        infos = []
        for g in group:
            if g.infos():
                infos.append(max(g.infos(), key=attrgetter("id")))

        # apply the checks
        return (
            len(infos) == network.size() - 1 and
            len(set([i.number for i in infos])) == 1 and
            all([i.contents in [Rwer, Wwer, "Ask Someone Else", "Bad Luck"] for i in infos])
        )


    def advance_group(self, network):
        # get the current group answers
        group = network.nodes(type=self.models.LottyNode)
        infos = []
        for g in group:
            if g.infos():
                infos.append(max(g.infos(), key=attrgetter("id")))
        answers = [i.contents for i in infos]

        # if everyone copied
        if all([a == "Ask Someone Else" for a in answers]):
            for i in infos:
                i.fail()
            self.notify_bad_luck(network)

        # if no-one copied
        elif not "Ask Someone Else" in answers:
            self.send_next_question(network)
            
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
            if info.topic == "Geography":
                neighbor.n_copies_geog = neighbor.n_copies_geog + 1
            elif info.topic == "Weight":
                 neighbor.n_copies_weight = neighbor.n_copies_weight + 1
            elif info.topic == "Language":
                 neighbor.n_copies_lang = neighbor.n_copies_lang + 1
            elif info.topic == "Art":
                 neighbor.n_copies_art = neighbor.n_copies_art + 1

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
        self.save()

        return new_info


    def update_node_bonus(self, node):
        # update the nodes bonus
        node.bonus = node.score >85

        # add node properties to ppt object
        ppt = node.participant
        ppt.property1 = node.score
        ppt.property2 = node.bonus


    def notify_bad_luck(self, network):
        source = network.nodes(type=Source)[0]
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
        for n in not_copiers:
            #connect the not copiers to the copiers
            n.connect(whom=copiers)

        source = nodes[0].network.nodes(type=Source)[0]
        source.transmit(what=Info(origin=source, contents="Good Luck"), to_whom=copiers)

        for i in group_infos:
            if i.contents == "Ask Someone Else":
                i.fail()

    
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
        node.last_request = datetime.now()
        
        # does anyone need kicking out?
        good_nodes = []
        bad_nodes = []
        for n in node.network.nodes(type=self.models.LottyNode):
            if (node.last_request - n.last_request).total_seconds() > 60:
                bad_nodes.append(n)
            else:
                good_nodes.append(n)

        if bad_nodes and node.id == max(good_nodes, key=attrgetter("id")).id:        
            for n in bad_nodes:
                n.fail()
            self.readvance_group(node.network)

        # fix for hanging issue.
        received_transmissions = node.transmissions(direction="incoming", status="received")
        if not transmissions:
            if received_transmissions:
                most_recent_transmission = max(received_transmissions, key=attrgetter("id"))
                responses = node.infos(failed="all")
                transmission_newer_than_response = False
                if responses:
                    most_recent_response = max(responses, key=attrgetter("id"))
                    if most_recent_transmission.receive_time > most_recent_response.creation_time:
                        transmission_newer_than_response = True
                if transmission_newer_than_response or not responses:
                    if not node.transmissions(direction="incoming", status="pending"):
                        most_recent_transmission.origin.transmit(what=most_recent_transmission.info, to_whom=node)

    def readvance_group(self, network):
        if self.group_ready_to_advance(network):
            self.advance_group(network)

    def assignment_abandoned(self, participant):
        networks = [n.network for n in participant.nodes()]
        self.fail_participant(participant)
        for n in networks:
            self.readvance_group(n)

    def assignment_returned(self, participant):
        networks = [n.network for n in participant.nodes()]
        self.fail_participant(participant)
        for n in networks:
            self.readvance_group(n)

    def node_get_request(self, node, nodes):
        if node.type == "lotty_node":
            node.last_request = datetime.now()
