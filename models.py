from dallinger.nodes import Source


class QuizSource(Source):
    """A Source that reads in a question from a file and transmits it."""

    __mapper_args__ = {
        "polymorphic_identity": "quiz_source"
    }

    def _contents(self):
        """Define the contents of new Infos .... (New transmissions??)

        transmit() -> _what() -> create_information() -> _contents().
        """
        number_transmissions = len(self.infos())
        import json
        questions = [
            json.dumps({
                'question': 'In which country is the red dot located?',
                'number':1,
                'round': 1,
                'topic': 'Geography',
                'Wwer': 'Guatemala',
                'Rwer': 'Belize',
                'pic': True, 
                }),
            json.dumps({
                'question': 'In which city is the red dot located?',
                'number':2,
                'round':1,
                'topic': 'Geography',
                'Wwer': 'Nigeria',
                'Rwer': 'The Ivory Coast',
                'pic': True, 
                }),
            json.dumps({
                'question': 'The capital of Hawaii is',
                'number':3,
                'round':1,
                'topic': 'Geography',
                'Wwer': 'Waikiki',
                'Rwer': 'Honolulu',
                'pic': False, 
                }),
            json.dumps({
                'question': 'Saint Helena is an island in',
                'number':4,
                'round':1,
                'topic':'Georgraphy',
                'Wwer': 'The Indian Ocean',
                'Rwer': 'The South Atlantic Ocean',
                'pic': False,
                }),
            json.dumps({
                'question': 'Which country shares a border with El Salvador?',
                'number':5,
                'round':1,
                'topic':'Georgraphy',
                'Wwer': 'Paraguay',
                'Rwer': 'Honduras',
                'pic': False,
                }),
            json.dumps({
                'question': 'What is the average weight of a pink salmon?',
                'number':6,
                'round': 2,
                'topic': 'Weight',
                'Wwer': '17kg',
                'Rwer': '1.7kg',
                'pic': False,
                }),
            json.dumps({
                'question': 'A cricket bat weighs',
                'number':7,
                'round': 2,
                'topic': 'Weight',
                'Wwer': '14kg',
                'Rwer': '1.4kg',
                'pic': False,
                }),
            json.dumps({
                'question': 'The average weight of a camel is',
                'number':8,
                'round':2,
                'topic': 'Weight',
                'Wwer': '48kg',
                'Rwer': '480kg',
                'pic': False,
                }),
            json.dumps({
                'question': 'Which dog weighs more, on average',
                'number':9,
                'round':2,
                'topic': 'Weight',
                'Wwer': 'Labrador',
                'Rwer': 'Great Dane',
                'pic': False,
                }),
            json.dumps({
                'question': 'What does a typical (class 1A) fire extinguisher weigh?',
                'number':10,
                'round': 2,
                'topic':'Weight',
                'Wwer': '115kg',
                'Rwer': '1.15kg',
                'pic': False,
                })
        ]
        number_transmissions = len([i for i in self.infos() if i.contents not in ["Bad Luck", "Good Luck"]])
        if number_transmissions < len(questions):
            question = questions[number_transmissions]
        else:
            question = questions[-1]
        return question
