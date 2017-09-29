from dallinger.nodes import Source


class WarOfTheGhostsSource(Source):
    """A Source that reads in a random story from a file and transmits it."""

    __mapper_args__ = {
        "polymorphic_identity": "war_of_the_ghosts_source"
    }

    def _contents(self):
        """Define the contents of new Infos.

        transmit() -> _what() -> create_information() -> _contents().
        """
        number_transmissions = len(self.infos())
        stories = [
            "Q1.md",
            "Q2.md",
            "Q3.md",
            "Q4.md",
            "Q5.md",
            "Q6.md",
            "Q7.md",
            "Q8.md",
            "Q9.md",
            "Q10.md"
        ]
        if number_transmissions < len(stories):
            story = stories[number_transmissions]
        else:
            story = stories[-1]
        with open("static/stimuli/{}".format(story), "r") as f:
            return f.read()
