"""Bartlett's transmission chain experiment from Remembering (1932)."""

import logging

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
        self.group_size = 3
        super(Bartlett1932, self).__init__(session)
        import models
        self.models = models
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
        node = Node(network=network, participant=participant)
        # letter is that node's network ID -1 of this string. so a node in network ID 1 would have the zero'th letter of this string; A. 
        letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[node.network_id - 1]
        # number is the length of the network nodes - 1, so if there are 4 nodes, number is 3 (what is failed doing?)
        number = len(network.nodes(failed="all")) - 1
        # name is the letter plus the number (turned into a string)
        name = letter + str(number)
        #name is then assigned to node's property1 in the database
        node.property1 = name
        node.property2 = 0
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
        question_number = info.property1
        
        # have all the other nodes answered this question
        # other nodes are defined as nodes in the network that are not current node, and are not the source. 
        other_nodes = [n for n in node.network.nodes() if n != node and not isinstance(n, Source)]
        # we're ready to receive next transmission:
        ready = True
        # unless: 
        for n in other_nodes:
            # if the question number is not in the corresponding property1 column for the last received info(? not sure what n.infos() does exactly here.
            if question_number not in [i.property1 for i in n.infos()]:
                ready = False

        if ready:
            # has anyone copied?
            infos = [info]
            for n in other_nodes:
                #for all other nodes, do something with n.infos if we're on the latest question number.
                infos.extend([i for i in n.infos() if i.property1 == question_number])
                #answers are in the contents column in the database for that latest info
                answers = [i.contents for i in infos]

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

        for i in infos:
            if i.contents == node.property1:
                node.property2 += 1

    def recruit(self):
        """Recruit one participant at a time until all networks are full."""
        if self.networks(full=False):
            self.recruiter().recruit(n=1)

        else:
            self.recruiter().close_recruitment()


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

