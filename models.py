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
            "ghosts.md",
            "cricket.md",
            "moochi.md",
            "outwit.md",
            "raid.md",
            "species.md",
            "tennis.md",
            "vagabond.md"
        ]
        if number_transmissions < len(stories):
            story = stories[number_transmissions]
        else:
            story = stories[-1]
        with open("static/stimuli/{}".format(story), "r") as f:
            return f.read()
