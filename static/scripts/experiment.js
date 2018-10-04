var my_node_id;
var most_recent_question = 0;
var player_id;

var condition = "C";
$("#round2divC").hide();
// Consent to the experiment.
$(document).ready(function() {

    // do not allow user to close or reload
    prevent_exit = true;

    // Print the consent form.
    $("#print-consent").click(function() {
        console.log("hello");
        window.print();
    });

    // Consent to the experiment.
    $("#consent").click(function() {
        store.set("recruiter", dallinger.getUrlParameter("recruiter"));
        store.set("hit_id", dallinger.getUrlParameter("hit_id"));
        store.set("worker_id", dallinger.getUrlParameter("worker_id"));
        store.set("assignment_id", dallinger.getUrlParameter("assignment_id"));
        store.set("mode", dallinger.getUrlParameter("mode"));

        dallinger.allowExit();
        window.location.href = '/instructions';
    });

    // Consent to the experiment.
    $("#no-consent").click(function() {
        dallinger.allow_exit();
        window.close();
    });

    // Consent to the experiment.
    $("#go-to-experiment").click(function() {
        dallinger.allow_exit();
        window.location.href = '/exp';
    });

    // Submit the questionnaire.
    $("#submit-questionnaire").click(function() {
        submitResponses();
    });

    $("#submit-response").click(function() {
        $("#submit-response").addClass('disabled');
        $("#submit-response").html('Sending...');
        $("#question").html("Waiting for other players to catch up.");

// when submit response is submitted, then the contents are requested/posted as an info for that node??
       reqwest({
            url: "/info/" + my_node_id,
            method: 'post',
            data: {
                contents: response,
                info_type: "Info"
            },
        });
    });

    $("#submit-a").click(function() {
        disable_answer_buttons();
        submit_response($("#submit-a").text());
    });

    $("#submit-b").click(function() {
        disable_answer_buttons();
        submit_response($("#submit-b").text());
    });

    $("#submit-copy").click(function() {
        disable_answer_buttons();
        submit_response($("#submit-copy").text());
    });

    $("#info-choice-a").click(function() {
        disable_choice_buttons();
        info_chosen = $("#info-choice-a").text();
        check_neighbors(info_chosen);
    });

    $("#info-choice-b").click(function() {
        disable_choice_buttons();   
        info_chosen = $("#info-choice-b").text();
        check_neighbors(info_chosen);
    });

    $("#info-choice-c").click(function() {
        disable_choice_buttons();   
        info_chosen = $("#info-choice-c").text();
        check_neighbors(info_chosen);
    });

    $("#round2button").click(function() {
        $("#welcome_div").show();
        $("#submit_div").show();
        $("#neighbor_buttons").show();
        $("#info_choice_buttons").show();
        $("#round2divC").hide();
    })

    disable_answer_buttons();
    disable_choice_buttons();
    hide_pics();

});

add_neighbor_buttons = function() {
    dallinger.getExperimentProperty("group_size")
    .done(function (resp) {
        group_size = resp.group_size;
        start = '<button id="neighbor_button_';
        stop = '" type="button" class="btn btn-primary"></button>';
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
                "margin-right": "12px"
            });
        }
        disable_neighbor_buttons();
    });
}


//not entirely sure what this does
submit_response = function(response, copy=false, info_chosen="NA") {
    score = (response == Rwer)*1
    dallinger.createInfo(my_node_id, {
        contents: response,
        info_type: "Info",
        property1: number,
        property2: copy,
        property3: score,
        property4: info_chosen,
        property5: round
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
        player_id = resp.node.property1;
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
        $("#question").html("Sorry, everyone chose to copy, so no one can score points");
        submit_response("Bad Luck");    
    } else if (info.contents == "Good Luck" && round == 2) {
        //if it's round 2 and people are copying, give them info choice
        info_choice();
    } else if (info.contents == "Good Luck" && round == 1 && condition == "A") {
        // if it's round 1 and people copy, check neighbors
        info_chosen = "Their player ID";
        check_neighbors(info_chosen);
    } else if (info.contents == "Good Luck" && round == 1 && (condition =="B" || condition == "C")) {
        info_chosen = "Their total score on Round 1";
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
        if (number ==6) {
            $("#welcome_div").hide();
            $("#submit_div").hide();
            $("#neighbor_buttons").hide();
            $("#info_choice_buttons").hide();
            $("#round2divC").show();
        } else {
            $("#round2divC").hide();
        }
        $("#question").html(question);
        $("#question_number").html("You are on question " + number + " of the " + topic + " topic");
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
    }
};

var info_choice = function() {
    $("#question").html("What information do you want to see about your neighbours?");
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
                $("#question").html("You have " + num_neighbors + " person to copy from:");
            } else {
                $("#question").html("You have " + num_neighbors + " people to copy from:");
            }
            neighbors.forEach(function(entry) {
                if (entry.type != "quiz_source") {
                    button_id = "#neighbor_button_" + current_button;
                    if (info_chosen == "Their player ID") { 
                        $(button_id).html(entry.property1);
                    } else if (info_chosen == "How many times they were chosen in Round 1") {
                        $(button_id).html(entry.property2);
                    } else if (info_chosen == "Their total score on Round 1") {
                        $(button_id).html(entry.property3);
                    }    
                    $(button_id).click(function() {
                        submit_response(entry.id, true, info_chosen);
                        disable_neighbor_buttons();
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
}

enable_choice_buttons = function() {
    if (condition == "A" || condition == "B") {
        $("#info-choice-a").removeClass('disabled');
        $("#info-choice-b").removeClass('disabled');
        $("#info-choice-a").show();
        $("#info-choice-b").show();
    } else if (condition == "C") {
        $("#info-choice-b").removeClass('disabled');
        $("#info-choice-c").removeClass('disabled');
        $("#info-choice-b").show();
        $("#info-choice-c").show();
    } 
}






