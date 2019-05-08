// this function runs immediately once the page is loaded
$(document).ready(function() {

    // add functionality to warning acknowledge button
    $("#warning_button").click(function() {
        $("#welcome_div").show();
        $("#submit_div").show();
        $("#neighbor_buttons").show();
        $("#warning_div").hide();
        display_question();
    });
});

response_submitted = function() {
    if (number == "40") {
        dallinger.allowExit();
        dallinger.goToPage("round2");
    } else {
        setTimeout(function() {
            get_transmissions();
        }, 1000);
    }
}

display_question_or_warning = function() {
    // if its q1, show the round 1 warning
    if (number == 1) {
        display_round_warning();
    } else {
        display_question();
    }
}

// show participants the warning that they are starting the experiment proper
display_round_warning = function() {
    $("#welcome_div").hide();
    $("#wait_div").hide();
    $("#warning_div").show();
}

process_good_luck = function() {
    if (condition == "A") {
        console.log("*** Getting neighbors by player id");
        info_chosen = "Player ID";
    } else if (condition == "B" || condition == "C") {
        info_chosen = "Total Score in Round 1";
        console.log("*** Getting neighbors by total score");
    }
    check_neighbors(info_chosen);
}

update_question_number_text = function() {
    $("#question_number").html("You are in the " + topic + " Round, on question " + number + "/100");
}