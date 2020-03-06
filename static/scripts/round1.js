// this function runs immediately once the page is loaded
$(document).ready(function() {

    $("#welcome_div").show();
    // add functionality to warning acknowledge button
    $(".warning_button").click(function() {
        $("#welcome_div").show();
        $("#submit_div").show();
        $("#neighbor_buttons").show();
        $("#warning_div").hide();
        $("#topic_div").hide();
        display_question();
    });
});

response_submitted = function(resp) {
    if (resp.info.contents != "Ask Someone Else" && number == "59") {
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
    } else if ([16, 31, 46].includes(number)) {
        display_topic_warning();
    } else { 
        display_question();
    }
}

// show participants the warning that they are starting the experiment proper
display_round_warning = function() {
    $("#welcome_div").hide();
    $("#wait_div").hide();
    $("#topic_div").hide();
    $("#warning_div").show();
}

display_topic_warning = function() {
    $("#welcome_div").hide();
    $("#wait_div").hide();
    $("#warning_div").hide();
    $("#topic_div").show();
    setTimeout(function() {
            $("#topic_div").hide();
            display_question();
        }, 3000);
}

process_good_luck = function() {
    info_chosen = "Topic Score";
    check_neighbors(info_chosen);
}

update_question_number_text = function() {
    if (topic =="Geography") {
        $("#question_number").html("You are in the <font size='5' color='green'> Geography </font> topic on question " + number + "/100");
    } else if (topic =="Weight") {
        $("#question_number").html("You are in the <font size='5' color='blue'> Weight </font> topic on question " + number + "/100");
    } else if (topic =="Language") {
        $("#question_number").html("You are in the <font size='5' color='purple'> Language </font> topic on question " + number + "/100");
    } else if (topic =="Art") {
        $("#question_number").html("You are in the <font size='5' color='orange'> Art </font> topic on question " + number + "/100");
    } 
}









