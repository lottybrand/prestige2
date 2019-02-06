
var condition = "B";
if ((condition == "A") || (condition == "B")) {
    check_info = 'their Player ID, or, the number of times they were chosen by others in Round 1.'
} else {
    check_info = 'their total score in Round 1, or, the number of times they were chosen by others in Round 1.'
}

// this function runs immediately once the page is loaded
$(document).ready(function() {

    // Hide divs that should not be initially visible
    $("#practice").hide();
    $("#round2div").hide();
    $("#round2div_check").hide();

    // Change functionality of the consent button
    $("#consent").click(function() {
        store.set("recruiter", dallinger.getUrlParameter("recruiter"));
        store.set("hit_id", dallinger.getUrlParameter("hit_id"));
        store.set("worker_id", dallinger.getUrlParameter("worker_id"));
        store.set("assignment_id", dallinger.getUrlParameter("assignment_id"));
        store.set("mode", dallinger.getUrlParameter("mode"));

        dallinger.allowExit();
        if (condition == "A") {
            window.location.href = '/instructions';
        } else { 
            window.location.href= '/instructionsB';
        }
    });

    // Add functionality to buttons controlling participantss answers
    // either option a, option b, or copy someone else.

    $("#submit-a").click(function() {
        submit_answer("#submit-a")
    });

    $("#submit-b").click(function() {
        submit_answer("#submit-b")
    });

    $("#submit-copy").click(function() {
        submit_answer("#submit-copy")
    });

    submit_answer = function(answer) {
        clearTimeout(answer_timeout);
        $("#countdown").hide();
        disable_answer_buttons();
        submit_response($(answer).text());
    }

    // Add functionality to buttons controlling participants' info choice

    $("#info-choice-a").click(function() {
        submit_choice("#info-choice-a")
    });

    $("#info-choice-b").click(function() {
        submit_choice("#info-choice-b")
    });

    submit_choice = function(choice) {
        disable_choice_buttons();   
        info_chosen = $("choice").text();
        check_neighbors(info_chosen);
    }

    // Add functionality to the round 2 button
    // This means participants have acknowledge they are starting round 2
    // and they will be shown a quick test of this ability

    $("#round2okay").click(function() {
        $("#round2div_check").show();
        enable_R2_buttons();
        clearTimeout(answer_timeout);
        $("#round2div").hide();
    });

    // Add functionality to the practice button
    // this button starts the practice rounds

    $("#practiceButton").click(function() {
        start_new_timeout();
        $("#welcome_div").show();
        $("#submit_div").show();
        $("#neighbor_buttons").show();
        $("#info_choice_buttons").show();
        $("#round2div").hide();
        $("#round2div_check").hide();
        $("#practice").hide();
    });

    // Check AB/C are the buttons with one of the possible info choices
    // they are used to test participants attention to the instructions

    if (condition == "A" || condition == "B") {
        $("#check_AB").click(function() {
            update_ui_attention_check_passed();
        });
        $("#check_C").click(function() {
            update_ui_attention_check_failed();
        });
    } else if (condition == "C") {
        $("#check_AB").click(function(){
            update_ui_attention_check_failed();
        });
        $("#check_C").click(function() {
            update_ui_attention_check_passed();
        });
    }

    update_ui_attention_check_passed = function() {
        start_new_timeout();
        $("#welcome_div").show();
        $("#submit_div").show();
        $("#neighbor_buttons").show();
        $("#info_choice_buttons").show();
        $("#round2div").hide();
        $("#round2div_check").hide();
    }

    update_ui_attention_check_failed = function() {
        clearTimeout(answer_timeout);
        $("#wrong_check").html("WRONG ANSWER, PLEASE READ AGAIN");
        disable_R2_buttons();
        setTimeout(function() {
            $("#round2div_check").hide();
            $("#wrong_check").hide();
            $("#round2div").show();
        }, 2000);
    }

    // initially hide the buttons

    disable_answer_buttons();
    disable_choice_buttons();
    hide_pics();

});

add_neighbor_buttons = function() {
    dallinger.getExperimentProperty("group_size")
    .done(function (resp) {
        group_size = resp.group_size;
        start = '<button id="neighbor_button_';
        stop = '" type="button" class="btn btn-success"></button>';
        button_string = '';
        for (i = 1; i <= group_size-1; i++) {
            button_string = button_string.concat(start);
            button_string = button_string.concat(i);
            button_string = button_string.concat(stop);
        }
        $("#neighbor_buttons").html(button_string);
        $("#neighbor_buttons").hide();
        $(button_string).prop("disabled",true);
        for (i = 1; i <= group_size-1; i++) {
            button_string = "#neighbor_button_" + i;
            $(button_string).css({
                "margin-right": "14px"
            });
        }
        disable_neighbor_buttons();
    });
}



submit_response = function(response, copy=false, info_chosen="NA") {
    score = (response == Rwer)*1
    dallinger.createInfo(my_node_id, {
        contents: response,
        info_type: "LottyInfo",
        property1: JSON.stringify({
            "number": number,
            "copying": copy,
            "score": score,
            "info_chosen": info_chosen,
            "round": round
        })
    }).done(function (resp) {
        most_recent_question = number;
        setTimeout(function() {
            get_transmissions();
        }, 1000);
    });
}

// Create the agent.
var create_agent = function() {
    dallinger.createAgent()
    .done(function (resp) {
        my_node_id = resp.node.id;
        my_network_id = resp.node.network_id;
        player_id = JSON.parse(resp.node.property1).name;
        $("#welcome").html("Welcome to our quiz, you are player " + player_id);
        get_transmissions(my_node_id);
    })
    .fail(function (rejection) {
      // A 403 is our signal that it's time to go to the questionnaire
        if (rejection.status === 403) {
            dallinger.allowExit();
            dallinger.goToPage('questionnaire');
        } else {
            dallinger.error(rejection);
        }
    });
};

// get any pending incoming transmissions
var get_transmissions = function() {
    dallinger.getTransmissions(my_node_id, {
        status: "pending"
    })
    .done(function (resp) {
        transmissions = resp.transmissions;
        if (transmissions.length > 0) {
            if (transmissions.length > 1) {
                // if there's more than 1 something probably went wrong
                console.log("More than one transmission - unexpected!");
            } else {
                // if there is exactly one, get the info that was sent
                get_info(transmissions[0].info_id);
            }
        } else {
            // if there are none wait a second and try again
            setTimeout(function(){
                get_transmissions();
            }, 1000);
        }
    })
    .fail(function (rejection) {
        console.log(rejection);
        $('body').html(rejection.html);
    });
}

// get a specific info
var get_info = function(info_id) {
    dallinger.getInfo(my_node_id, info_id)
    .done(function(resp) {
        process_info(resp.info);
    })
    .fail(function (rejection) {
        console.log(rejection);
        $('body').html(rejection.html);
    });
}

// process an info
var process_info = function(info) {
    if (info.contents == "Bad Luck") {
        // if everyone copied you are forced to submit "bad luck"
        $("#question").html("Sorry, everyone chose to Ask Someone Else, so no one can score points for this question");
        setTimeout(function() {
            submit_response("Bad Luck");
        }, 3000);    
    } else if (info.contents == "Good Luck" && round == 2) {
        //if it's round 2 and people are copying, give them info choice
        info_choice();
    } else if (info.contents == "Good Luck" && (round == 1 || round == 0) && condition == "A") {
        // if it's round 1 and people copy, check neighbors
        info_chosen = "Player ID";
        check_neighbors(info_chosen);
    } else if (info.contents == "Good Luck" && (round == 1 || round == 0) && (condition =="B" || condition == "C")) {
        info_chosen = "Total Score";
        check_neighbors(info_chosen);
    } else {
        // if you have received a question
        question_json = JSON.parse(info.contents);
        round = question_json.round;
        question = question_json.question;
        Wwer = question_json.Wwer;
        Rwer = question_json.Rwer;
        number = question_json.number;
        topic = question_json.topic;
        round = question_json.round;
        pic = question_json.pic;
        if (number ==1) {
            $("#welcome_div").hide();
            $("#submit_div").hide();
            $("#neighbor_buttons").hide();
            $("#info_choice_buttons").hide();
            $("#round2div").hide();
            $("#practice").show();
            $("#practiceInfo").html('The first three questions were practice questions. You are now starting the real quiz and your score will be counted');
        } else {
            $("#practice").hide();
        }
        if (number ==41) {
            $("#welcome_div").hide();
            $("#submit_div").hide();
            $("#neighbor_buttons").hide();
            $("#info_choice_buttons").hide();
            $("#round2div").show();
            $("#r2info").html('You are now starting Round 2.<br><br>You will now be given two choices each time you choose to "Ask Someone Else".<br><br>You will be able to choose between seeing either ' + check_info);
        } else {
            $("#round2div").hide();
        }
        if (number ==101) {
            dallinger.allowExit();
            dallinger.goToPage('questionnaire');
        }
        $("#question").html(question);
        if (round != 0) {
            $("#question_number").html("You are in the " + topic + " topic, on question " + number + "/100");
        } else {
            $("#question_number").html("You are in the " + topic + " Round, on question " + number + "/3");
        }
        if (pic == true) {
            show_pics(number);
        } else {
            hide_pics();
        } 
        if (Math.random() <0.5) {
            $("#submit-a").html(Wwer);
            $("#submit-b").html(Rwer);
        } else {
            $("#submit-b").html(Wwer);
            $("#submit-a").html(Rwer);
        }
        enable_answer_buttons();
        countdown = 15
        if (number !=1 && number!=41) {
            start_new_timeout();
        }
    }
};

var start_new_timeout = function() {
    answer_timeout = setTimeout(function() {
        countdown = countdown - 1
        $("#countdown").show();
        $("#countdown").html(countdown);
        if (countdown <= 0) {
            $("#countdown").show();
            $("#countdown").html("")
            disable_answer_buttons();
            submit_response(Wwer);
        } else {
            start_new_timeout();
        }
    }, 1000);
};


var info_choice = function() {
    clearTimeout(answer_timeout);
    $("#question").html("What information do you want to see about the other players?");
    enable_choice_buttons();
};


var check_neighbors = function(info_chosen) {
    reqwest({
        url: "/node/" + my_node_id + "/neighbors",
        method: 'get',
        type: 'json',
        data: {connection: "from"},
        success: function (resp) {
            neighbors = resp.nodes;
            current_button = 1;
            num_neighbors = neighbors.length - 1;
            if (num_neighbors == 1) {
                clearTimeout(answer_timeout);
                $("#question").html("You have " + num_neighbors + " player to copy from, please select a player to copy");
                $("#countdown").hide();
            } else {
                clearTimeout(answer_timeout);
                $("#question").html("You have " + num_neighbors + " players to copy from, please select a player to copy");
                $("#countdown").hide();
            }
            neighbors.forEach(function(entry) {
                clearTimeout(answer_timeout);
                if (entry.type != "quiz_source") {
                    button_id = "#neighbor_button_" + current_button;
                    if (info_chosen == "Player ID") { 
                        $(button_id).html("<img src='/static/images/stick.png' height='90' width='50'><br>" + "player ID: " + JSON.parse(entry.property1).name);
                        $("#question1").html("Below are their Player IDs");
                        $("#question1").show();
                        $("#countdown").hide();
                    } else if (info_chosen == "Times chosen in Round 1") {
                        $(button_id).html("<img src='/static/images/stick.png' height='90' width='50'><br>" + "chosen " + JSON.parse(entry.property1).n_copies + " times");
                        $("#question1").html("Below are how many times they were chosen in Round 1 by other players");
                        $("#question1").show();
                        $("#countdown").hide();
                    } else if (info_chosen == "Total Score") {
                        $(button_id).html("<img src='/static/images/stick.png' height='90' width='50'><br>" + JSON.parse(entry.property1).asoc_score + " correct");
                        $("#question1").html("Below is how many questions they have answered correctly themselves");
                        $("#question1").show();
                        $("#countdown").hide();
                    }    
                    $(button_id).click(function() {
                        submit_response(entry.id, true, info_chosen);
                        disable_neighbor_buttons();
                        $("#question1").hide();
                    });
                    $(button_id).prop("disabled",false);
                    $(button_id).show();
                    current_button = current_button + 1;
                } 
            });
            $("#neighbor_buttons").show();
        }
    });
};

disable_R2_buttons = function() {
    $("#check_AB").addClass('disabled');
    $("#check_C").addClass('disabled');
}

enable_R2_buttons = function() {
    $("#check_AB").removeClass('disabled');
    $("#check_C").removeClass('disabled');
}

disable_answer_buttons = function() {
    $("#submit-a").addClass('disabled');
    $("#submit-b").addClass('disabled');
    $("#submit-copy").addClass('disabled');
    $("#submit-a").hide();
    $("#submit-b").hide();
    $("#submit-copy").hide();
    $("#question").html("Waiting for other players to catch up.");
}

disable_choice_buttons = function() {
    $("#info-choice-a").addClass('disabled');
    $("#info-choice-b").addClass('disabled');
    $("#info-choice-c").addClass('disabled');
    $("#info-choice-a").hide();
    $("#info-choice-b").hide();
    $("#info-choice-c").hide();
    $("#question").html("Waiting for other players to catch up.");
}

disable_neighbor_buttons = function() {
    $("#neighbor_buttons").hide();
    for (i = 1; i <= group_size-1; i++) {
        button_string = "#neighbor_button_" + i;
        $(button_string).html("");
        $(button_string).hide();
        $(button_string).prop("disabled",true);
        $(button_string).off("click");
    }
    $("#question").html("Waiting for other players to catch up.");
}

disable_all_buttons = function() {
    disable_answer_buttons();
    disable_choice_buttons();
    disable_neighbor_buttons();
}

hide_pics = function() {
    $("#pics").hide();
}

show_pics = function(number) {
    $("#pics").attr("src", "/static/images/" + number + ".png");
    $("#pics").show();
}

enable_answer_buttons = function() {
    $("#submit-a").removeClass('disabled');
    $("#submit-b").removeClass('disabled');
    $("#submit-copy").removeClass('disabled');
    $("#submit-a").show();
    $("#submit-b").show();
    $("#submit-copy").show();

    if ((condition == "A") || (condition == "B")) {
        info_choice_a = "Player ID"
    } else {
        info_choice_a = "Total Score"
    }

    if (Math.random() <0.5) {
        enable_choice_buttons = function() {
            $("#countdown").hide();
            $("#info-choice-a").removeClass('disabled');
            $("#info-choice-b").removeClass('disabled');
            $("#info-choice-a").html(info_choice_a);
            $("#info-choice-a").show();
            $("#info-choice-b").html("Times chosen in Round 1")
            $("#info-choice-b").show();
        }
    }else{
        enable_choice_buttons = function() {
            $("#countdown").hide();
            $("#info-choice-b").removeClass('disabled');
            $("#info-choice-a").removeClass('disabled');
            $("#info-choice-a").html("Times chosen in Round 1");
            $("#info-choice-a").show();
            $("#info-choice-b").html(info_choice_a);
            $("#info-choice-b").show();
        }
    }
}









