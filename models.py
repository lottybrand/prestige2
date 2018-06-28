from dallinger.nodes import Source


class QuizSource(Source):
    """A Source that reads in a question from a file and transmits it."""

    __mapper_args__ = {
        "polymorphic_identity": "quiz_source"
    }

    def _contents(self):
        """Define the contents of new Infos.

        transmit() -> _what() -> create_information() -> _contents().
        """
        number_transmissions = len(self.infos())
        import json
        questions = [
            json.dumps({
                'question 1': 'The starry night is a famous painting by',
                'W answer': 'Jackson Pollock',
                'R answer': 'Vincent van Gogh'
                })
        ]
        if number_transmissions < len(questions):
            question = questions[number_transmissions]
        else:
            question = questions[-1]
