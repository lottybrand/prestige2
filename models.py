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
                'question': 'The starry night is a famous painting by',
                'number':1,
                'topic': 'Art',
                'Wwer': 'Jackson Pollock',
                'Rwer': 'Vincent van Gogh',
                }),
            json.dumps({
                'question': 'The singing butler is a famous painting by the Scottish artist',
                'number':2,
                'topic': 'Art',
                'Wwer': 'Andrew Geddes',
                'Rwer': 'Jack Vettriano',
                }),
            json.dumps({
                'question': 'The capital of Hawaii is',
                'number':3,
                'topic': 'Geography',
                'Wwer': 'Waikiki',
                'Rwer': 'Honolulu',
                }),
            json.dumps({
                'question': 'Saint Helena is an island in',
                'number':4,
                'topic':'Georgraphy',
                'Wwer': 'The Indian Ocean',
                'Rwer': 'The South Atlantic Ocean',
                }),
            json.dumps({
                'question': 'Which country shares a border with El Salvador?',
                'number':5,
                'topic':'Geography',
                'Wwer': 'Paraguay',
                'Rwer': 'Honduras',
                })
        ]
        number_transmissions = len([i for i in self.infos() if i.contents not in ["Bad Luck", "Good Luck"]])
        if number_transmissions < len(questions):
            question = questions[number_transmissions]
        else:
            question = questions[-1]
        return question
