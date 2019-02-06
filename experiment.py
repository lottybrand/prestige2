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
        self.group_size = 4
        super(Bartlett1932, self).__init__(session)
        import models
        self.models = models

        self.known_classes["LottyInfo"] = self.models.LottyInfo
        self.known_classes["LottyNode"] = self.models.LottyNode
        self.experiment_repeats = 1
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
            'bonus': False
        })
        return node



    def add_node_to_network(self, node, network):
        """Add node to the chain and receive transmissions."""
        network.add_node(node)
        source = node.neighbors(type=Source, direction="from")[0]
        if network.full:
            source.transmit()

    def info_post_request(self, node, info):
        """Run when a request to create an info is complete."""
        # question number is found in info's property1 in the database
        question_number = info.number
        
        # have all the other nodes answered this question
        # other nodes are defined as nodes in the network that are not current node, and are not the source. 
        other_nodes = [n for n in node.network.nodes() if n != node and not isinstance(n, Source)]

        # get a list of everyones submitted info and answer
        infos = [info]
        for n in other_nodes:
            #for all other nodes, do something with n.infos if we're on the latest question number.
            infos.extend([i for i in n.infos() if i.number == question_number])
            #answers are in the contents column in the database for that latest info
            answers = [i.contents for i in infos]

        # are we ready to receive next transmission?
        ready = False
        if len(infos) == self.group_size:
            from operator import attrgetter
            if info == max(infos, key=attrgetter("id")):
                ready = True

        # if property 2 is true this means this is a copying decision
        if info.copying:
            # so find the neighbor to be copied
            neighbor = [n for n in other_nodes if n.id == int(info.contents)][0]
            # and increase their number of copies, but only if we're in round 1
            if info.round == 1:
                neighbor.n_copies = str(int(neighbor.n_copies) + 1)
            # fail the original info
            info.fail()
            # ask the neighbor to transmit their actual decision to the current player.
            from operator import attrgetter
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

            # update the nodes score according to the score of the new_info
            if info.round != 0:
                node.score = node.score + new_info.score

        # if its not a copying decision
        if not info.copying:
            # if its round 1
            if info.round == 1:
                # update node property3 which is the asocial score in round 1
                node.asoc_score = node.asoc_score + info.score

            # regardless of round, update node.property4 which is the total score across all rounds.
            if info.round != 0:
                node.score = node.score + info.score

        # update property5 to reflect whether or not the ppt has earned the bonus
        bonus_score = node.score
        if (bonus_score >= 90):
            node.bonus = True
        else: 
            node.bonus = False 

        # add node properties 4 and 5 to ppt object
        ppt = node.participant
        ppt.property1 = node.score
        ppt.property2 = node.bonus

        if ready:
            # if no one has copied
            if not "Ask Someone Else" in answers:
                # if everone has made a decision
                # tidy up any old vectors from previous neighbor copying
                source = node.neighbors(type=Source, direction="from")[0]
                vectors = node.network.vectors()
                for v in vectors:
                    if v.origin_id != source.id:
                        v.fail()
                #then get the source to transmit to all of its neighbors
                source.transmit()
                nodes = source.neighbors()
            # else if everyone copied
            elif all([a == "Ask Someone Else" for a in answers]):
                # I don't know what i.fail is doing here, is it preventing another transmission for now...?
                for i in infos:
                    i.fail()
                source = node.neighbors(type=Source, direction="from")[0]
                #then  the source transmits a bad luck message to everyone
                source.transmit(what=Info(origin=source, contents="Bad Luck"))

            # if some copied
            else:
                nodes = [node]
                for n in other_nodes:
                    nodes.append(n)
                for i in infos:
                    if i.contents == "Ask Someone Else":
                        i.fail()
                        #matching nodes to their answers here, and copiers are those nodes that have answered "ask someone else"
                copiers = [n for n, a in zip(nodes, answers) if a == "Ask Someone Else"]
                not_copiers = [n for n, a in zip(nodes, answers) if a != "Ask Someone Else"]
                for n in not_copiers:
                    #connect the not copiers to the copiers
                    n.connect(whom=copiers)
                    source = node.neighbors(type=Source, direction="from")[0]
                
                #transmit a good luck message from the source to all the copiers 
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
        node = nodes[0]

        bonus = node.bonus
        if (bonus == True):
            return 20
        else:
            return 0


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

