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
    $("#submit_div").hide();
    $("#neighbor_buttons").hide();
    $("#warning_div").show();
    $("#warning_info").html('The first four questions were practice questions. <br> <br> You are now starting Round 1 of the real quiz and your score will be counted. <br> <br> Round 1 consists of 40 questions. <br> <br> <br> REMEMBER: You will still score a point for yourself if you choose to "Ask Someone Else" and the person you choose answered that question correctly');
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