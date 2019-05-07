// what to do when an answer is submitted.
response_submitted = function() {
    if (number == "practice 4") {
        dallinger.allowExit();
        dallinger.goToPage("round1");
    } else {
        setTimeout(function() {
            get_transmissions();
        }, 1000);
    }
}

// what to do when a question is available to be displayed
display_question_or_warning = function() {
    // always display the question
    display_question();
}
