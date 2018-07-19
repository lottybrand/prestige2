"""Bartlett's transmission chain experiment from Remembering (1932)."""

import logging


from dallinger.networks import FullyConnected
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
        super(Bartlett1932, self).__init__(session)
        import models
        self.models = models
        self.experiment_repeats = 1
        self.initial_recruitment_size = 2
        if session:
            self.setup()



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
        return FullyConnected(max_size=self.initial_recruitment_size+1)

    def create_node(self, participant, network):
        """Create a node for a participant."""
        node = Node(network=network, participant=participant)
        letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[node.network_id - 1]
        number = len(network.nodes(failed="all")) - 1
        name = letter + str(number)
        node.property1 = name
        return node

    def add_node_to_network(self, node, network):
        """Add node to the chain and receive transmissions."""
        network.add_node(node)
        source = node.neighbors(type=Source, direction="from")[0]
        if network.full:
            source.transmit()

    def info_post_request(self, node, info):
        """Run when a request to create an info is complete."""
        # what question are we on?
        question_number = info.property1
        
        # have all the other nodes answered this question
        other_nodes = [n for n in node.network.nodes() if n != node and not isinstance(n, Source)]
        ready = True
        for n in other_nodes:
            if question_number not in [i.property1 for i in n.infos()]:
                ready = False

        if ready:
            # has anyone copied?
            infos = [info]
            for n in other_nodes:
                infos.extend([i for i in n.infos() if i.property1 == question_number])
                answers = [i.contents for i in infos]

            # if no one has copied
            if not "Ask Someone Else" in answers:
                source = node.neighbors(type=Source, direction="from")[0]
                source.transmit()
                nodes = source.neighbors()
            # else if everyone copied
            elif all([a == "Ask Someone Else" for a in answers]):
                for i in infos:
                    i.fail()
                source = node.neighbors(type=Source, direction="from")[0]
                source.transmit(what=Info(origin=source, contents="Bad Luck"))
            # if some copied
            else:
                nodes = [node]
                for n in other_nodes:
                    nodes.append(n)
                for i in infos:
                    if i.contents == "Ask Someone Else":
                        i.fail()
                copiers = [n for n, a in zip(nodes, answers) if a == "Ask Someone Else"]
                not_copiers = [n for n, a in zip(nodes, answers) if a != "Ask Someone Else"]
                for n in not_copiers:
                    n.connect(whom=copiers)
                    source = node.neighbors(type=Source, direction="from")[0]
                    source.transmit(what=Info(origin=source, contents="Good Luck"), to_whom=copiers)

    def recruit(self):
        """Recruit one participant at a time until all networks are full."""
        if self.networks(full=False):
            self.recruiter().recruit(n=1)

        else:
            self.recruiter().close_recruitment()

