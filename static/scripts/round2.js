$(document).ready(function() {

    $("#info-choice-a").click(function() {
        submit_choice("#info-choice-a");
    });

    $("#info-choice-b").click(function() {
        submit_choice("#info-choice-b");
    });

    submit_choice = function(choice) {
    	$("#info_choice_div").hide();
        info_chosen = ($(choice).text());
        check_neighbors(info_chosen);
    }

    $(".warning_button").click(function() {
    	$("#warning_div").hide();
        $("#topic_div").hide();
        $("#round2div_check").show();
    });

    update_ui_attention_check_passed = function() {
        $("#round2div_check").hide();
        $("#welcome_div").show();
        $("#wait_div").show();
        display_question();
    }

    update_ui_attention_check_failed = function() {
        $("#wrong_check").html("<font color='red'>WRONG ANSWER, PLEASE READ AGAIN</font>");
        disable_R2_buttons();
        setTimeout(function() {
        	$("#round2div_check").hide();
        	enable_R2_buttons();
            $("#wrong_check").html("");
            $("#warning_div").show();
        }, 2000);
    }

    // Check AB/C are the buttons with one of the possible info choices
    // they are used to test participants attention to the instructions

    $("#check_A").click(function() {
        get_source();
    	if (condition == "A") {
    		update_ui_attention_check_passed();
    	} else {
    		update_ui_attention_check_failed();
    	}
    });

    $("#check_B").click(function() {
        get_source();
        if (condition == "B") {
            update_ui_attention_check_passed();
        } else {
            update_ui_attention_check_failed();
        }
    });

    $("#check_C").click(function() {
        get_source();
    	if (condition == "C") {
    		update_ui_attention_check_passed();
    	} else {
    		update_ui_attention_check_failed();
    	}
    });
});

response_submitted = function(resp) {
    if (resp.info.contents != "Ask Someone Else" && number == "100") {
        dallinger.allowExit();
        dallinger.goToPage("questionnaire");
    } else {
        setTimeout(function() {
            get_transmissions();
        }, 1000);
    }
}

process_good_luck = function() {
	console.log("*** getting info choice");
    info_choice();    
}

display_question_or_warning = function() {
    if (number == 61) {
        display_round_warning();
    } else if ([71, 81, 91].includes(number)) {
        display_topic_warning();
    } else {
        display_question();
    }
}

// show participants the warning that they are starting the experiment proper
display_round_warning = function() {
    $("#welcome_div").hide();
    $("#wait_div").hide();

    if (condition == "A") {
        check_info = '<br><br> 1) the number of times they were chosen in Round 1 on the topic you are answering, <br><br> or <br><br> 2) the number of times they were chosen in Round 1 on a different topic.'
    } else if (condition =="B") {
            check_info = '<br><br> 1) the number of times they were chosen in Round 1 on a different topic to the one you are answering, <br><br> or <br><br> 2) the number of times they were chosen in Round 1 altogether.'
    } else if (condition =="C") {
            check_info = '<br><br> 1) the number of times they were chosen in Round 1 altogether, <br><br> or <br><br> 2) the number of times they were chosen in Round 1 on the topic you are answering.'
    }

    $("#warning_info").html('Thank you for completing Round 1. <br> <br> You are now starting Round 2 which consists of the final 40 questions.<br><br>You will now be given two choices each time you choose to "Ask Someone Else".<br><br>You will be able to choose between seeing either: ' + check_info);
    $("#warning_div").show();
}

update_question_number_text = function() {
	$("#question_number").html("You are in the " + topic + " Topic, on question " + number + "/100");
}

disable_R2_buttons = function() {
    $("#check_A").addClass('disabled');
    $("#check_B").addClass('disabled');
    $("#check_C").addClass('disabled');
}

enable_R2_buttons = function() {
    $("#check_A").removeClass('disabled');
    $("#check_B").removeClass('disabled');
    $("#check_C").removeClass('disabled');
}

assign_choice_buttons = function() {
    if (condition == "A") {
        info_choice_a = "Times Chosen on a Different Topic"
        info_choice_b = "Times Chosen on This Topic"
    } else if (condition == "B") {
        info_choice_a = "Times Chosen on a Different Topic"
        info_choice_b = "Times Chosen Altogether"
    } else if (condition =="C") {
        info_choice_a = "Times Chosen Altogether"
        info_choice_b = "Times Chosen on This Topic"
    }
    if (Math.random() < 0.5) {
        $("#info-choice-a").html(info_choice_a);
        $("#info-choice-b").html(info_choice_b)
    } else {
        $("#info-choice-a").html(info_choice_b);
        $("#info-choice-b").html(info_choice_a);
    }
}

info_choice = function() {
    assign_choice_buttons();
    $("#info_choice_div").show();
};

process_neighbors = function() {
    // update neighbor prompt
    if (neighbors.length == 1) {
        part1 = ("You have " + neighbors.length + " player to copy from, ");
        if (info_chosen == "Times Chosen on a Different Topic") { 
            part2 = "below is the times they were chosen in Round 1 on a Different Topic.";
        } else if (info_chosen == "Times Chosen Altogether") {
            part2 = "below is how many times they were chosen in Round 1 altogether.";
        } else if (info_chosen == "Times Chosen on This Topic") {
            part2 = "below is how many times they were chosen in Round 1 on this Topic.";
        }
    } else {
        part1 = ("You have " + neighbors.length + " players to copy from, ");
        if (info_chosen == "Times Chosen on a Different Topic") { 
            part2 = "below are how many times they were chosen in Round 1 on a Different Topic.";
        } else if (info_chosen == "Times Chosen Altogether") {
            part2 = "below are how many times they were chosen in Round 1 altogether.";
        } else if (info_chosen == "Times Chosen on This Topic") {
            part2 = "below are how many times they were chosen in Round 1 on this Topic.";
        }
    }

    $("#neighbor_prompt").html(part1 + part2 + " Please select a player to copy.")    

    // update neighbor buttons
    current_button = 1;
    neighbors.forEach(function(entry) {
        update_neighbor_button(current_button, entry)        
        current_button = current_button + 1;
    });

    // show the div
    $("#wait_div").hide()
    $("#neighbor_div").show()
};
