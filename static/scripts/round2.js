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

    $("#warning_button").click(function() {
    	$("#warning_div").hide();
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

    $("#check_AB").click(function() {
        get_source();
    	if (condition == "C") {
    		update_ui_attention_check_failed();
    	} else {
    		update_ui_attention_check_passed();
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
    if (number == 41) {
        display_round_warning();
    } else {
        display_question();
    }
}

// show participants the warning that they are starting the experiment proper
display_round_warning = function() {
    $("#welcome_div").hide();
    $("#wait_div").hide();

    if ((condition == "A") || (condition == "B")) {
        check_info = 'their Player ID, or, the number of times they were chosen by others in Round 1.'
    } else {
        check_info = 'their total score in Round 1, or, the number of times they were chosen by others in Round 1.'
    }

    $("#warning_info").html('Thank you for completing Round 1. <br> <br> You are now starting Round 2 which consists of the final 60 questions.<br><br>You will now be given two choices each time you choose to "Ask Someone Else".<br><br>You will be able to choose between seeing either ' + check_info);
    $("#warning_div").show();
}

update_question_number_text = function() {
	$("#question_number").html("You are in the " + topic + " Topic, on question " + number + "/100");
}

disable_R2_buttons = function() {
    $("#check_AB").addClass('disabled');
    $("#check_C").addClass('disabled');
}

enable_R2_buttons = function() {
    $("#check_AB").removeClass('disabled');
    $("#check_C").removeClass('disabled');
}

assign_choice_buttons = function() {
    if (condition == "A" || condition == "B") {
        info_choice_a = "Player ID"
    } else {
        info_choice_a = "Total Score in Round 1"
    }
    if (Math.random() < 0.5) {
        $("#info-choice-a").html(info_choice_a);
        $("#info-choice-b").html("Times chosen in Round 1")
    } else {
        $("#info-choice-a").html("Times chosen in Round 1");
        $("#info-choice-b").html(info_choice_a);
    }
}

info_choice = function() {
    assign_choice_buttons();
    $("#info_choice_div").show();
};
