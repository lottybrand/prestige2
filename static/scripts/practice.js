// variables
seconds_per_question = 15;

// this function runs immediately once the page is loaded
$(document).ready(function() {

    // Hide divs that should not be initially visible
    $("#practice").hide();

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
        $("#countdown").html("");
        disable_answer_buttons();
        submit_response(response=$(answer).text());
    }

    // Add functionality to the practice button
    // this button starts the practice rounds

    $("#practiceButton").click(function() {
        $("#welcome_div").show();
        $("#submit_div").show();
        $("#neighbor_buttons").show();
        $("#practice").hide();
        display_question();
    });

    // initially hide the buttons
    disable_answer_buttons();
    hide_pics();
    add_neighbor_buttons();
    get_details_from_store();
    get_transmissions();
});

submit_response = function(response, copy=false, info_chosen="NA", human=true) {
    dallinger.createInfo(my_node_id, {
        contents: response,
        info_type: "LottyInfo",
        property1: JSON.stringify({
            "number": number,
            "copying": copy,
            "score": (response == Rwer)*1,
            "info_chosen": info_chosen,
            "round": round,
            "human": human
        })
    }).done(function (resp) {
        if (number == "practice 4") {
            dallinger.allowExit();
            dallinger.goToPage("round1");
        } else {
            setTimeout(function() {
                get_transmissions();
            }, 1000);
        }
    })
    .fail(function (rejection) {
        dallinger.error(rejection);
    });
}

get_details_from_store = function() {
    my_node_id = store.get("node_id");
    my_network_id = store.get("network_id");
}

// get any pending incoming transmissions
// this function is called repeatedly while we are waiting for other to catch up.
// You should only ever get one transmission at a time, so if you get > 1 the 
// experiment just hangs.
get_transmissions = function() {
    dallinger.getTransmissions(my_node_id, {
        status: "pending"
    })
    .done(function (resp) {
        console.log("*** Checking for transmissions");
        transmissions = resp.transmissions;
        console.log("*** Resp:" + resp);
        if (transmissions.length > 0) {
            if (transmissions.length > 1) {
                console.log("More than one transmission - unexpected!");
            } else {
                console.log("*** Got one transmission, info id: " + transmissions[0].info_id);
                get_info(transmissions[0].info_id);
            }
        } else {
            console.log("*** Got 0 transmissions, waiting 1 s and repeating");
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
// use to get the contents of an info you have been sent.
var get_info = function(info_id) {
    dallinger.getInfo(my_node_id, info_id)
    .done(function(resp) {
        console.log("*** Getting info: " + resp);
        process_info(resp.info);
    })
    .fail(function (rejection) {
        console.log(rejection);
        $('body').html(rejection.html);
    });
}

// Process an info.
// 
var process_info = function(info) {
    // a contents of "Bad Luck" indicates that everyone copied.
    // participants are forced to answer "Bad Luck" which is always wrong.
    console.log("*** Processing ingo");
    if (info.contents == "Bad Luck") {
        console.log("*** info was bad luck");
        $("#question").html("Sorry, everyone chose to Ask Someone Else, so no one can score points for this question");
        setTimeout(function() {
            submit_response(response="Bad Luck",
                            copy=undefined,
                            info_chosen=undefined,
                            human=false);
        }, 3000);

    // a contents of "Good luck" indicates you chose to copy, but not everyone else did.
    // depending on the round and condition different things will happen
    } else if (info.contents == "Good Luck") {
        console.log("*** Info was good luck");
        if (condition == "A") {
            console.log("*** Getting neighbors by player id");
            info_chosen = "Player ID";
            check_neighbors(info_chosen);
        } else if (condition == "B" || condition == "C") {
            info_chosen = "Total Score in Round 1";
            console.log("*** Getting neighbors by total score");
            check_neighbors(info_chosen);
        }

    // Any other contents indicates its a question from the source.
    } else {
        // get question details
        console.log("*** Info is a question");
        parse_question(info);

        // display the question
        display_question();
    }
};

// Extract the relevant information from a question Info.
parse_question = function(question) {
    console.log("*** Parsing question");
    question_json = JSON.parse(question.contents);
    round = question_json.round;
    question_text = question_json.question;
    Wwer = question_json.Wwer;
    Rwer = question_json.Rwer;
    number = question_json.number;
    topic = question_json.topic;
    round = question_json.round;
    pic = question_json.pic;
}

// display the question
display_question = function() {
    console.log("*** Displaying question");
    $("#question").html(question_text);
    $("#question_number").html("You are in the " + topic + " Round, on question " + number + "/4");
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
    countdown = 15;
    start_answer_timeout();
}

start_answer_timeout = function() {
    $("#countdown").show();
    answer_timeout = setTimeout(function() {
        countdown = countdown - 1;
        $("#countdown").html(countdown);
        if (countdown <= 0) {
            disable_answer_buttons();
            $("#countdown").hide();
            $("#countdown").html("");
            submit_response(Wwer,
                            copy=undefined,
                            info_chosen=undefined,
                            human=false);
        } else {
            start_answer_timeout();
        }
    }, 1000);
}

var check_neighbors = function(info_chosen) {
    // get your neighbors
    dallinger.get(
        "/node/" + my_node_id + "/neighbors",
        {
            connection: "from",
            node_type: "LottyNode"
        }
    ).done(function (resp) {
        neighbors = resp.nodes;
        process_neighbors();
    })
}

process_neighbors = function() {
    // update question text
    if (neighbors.length == 1) {
        $("#question").html("You have " + neighbors.length + " player to copy from, please select a player to copy");
    } else {
        $("#question").html("You have " + neighbors.length + " players to copy from, please select a player to copy");
    }

    // update question1 text
    if (info_chosen == "Player ID") { 
        $("#question1").html("Below are their Player IDs");

    } else if (info_chosen == "Times chosen in Round 1") {
        $("#question1").html("Below are how many times they were chosen in Round 1 by other players");

    } else if (info_chosen == "Total Score in Round 1") {
        $("#question1").html("Below is how many questions they have answered correctly themselves");
    }
    $("#question1").show();

    // update neighbor buttons
    current_button = 1;
    neighbors.forEach(function(entry) {
        update_neighbor_button(current_button, entry)        
        current_button = current_button + 1;
    });

    // show the buttons
    $("#neighbor_buttons").show()
};

update_neighbor_button = function(number, neighbor) {
    // get neighbor properties, and button details
    neighbor_properties = JSON.parse(neighbor.property1);
    button_id = "#neighbor_button_" + current_button;
    neighbor_image = "<img src='/static/images/stick.png' height='90' width='50'><br>";

    // update button and question display according to info_chosen
    if (info_chosen == "Player ID") { 
        $(button_id).html(neighbor_image + "player ID: " + neighbor_properties.name);

    } else if (info_chosen == "Times chosen in Round 1") {
        $(button_id).html(neighbor_image + "chosen " + neighbor_properties.n_copies + " times");

    } else if (info_chosen == "Total Score in Round 1") {
        $(button_id).html(neighbor_image + neighbor_properties.asoc_score + " correct");
    }
    
    // add button functionality
    $(button_id).click(function() {
        submit_response(response=neighbor.id,
                        copy=true,
                        info_chosen=info_chosen);
        disable_neighbor_buttons();
        $("#question1").hide();
    });
    $(button_id).prop("disabled", false);
    $(button_id).show();
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


// This is called by the exp.html page, it creates a set of buttons for your current
// group size.
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
        for (i = 1; i <= group_size-1; i++) {
            button_string = "#neighbor_button_" + i;
            $(button_string).css({
                "margin-right": "14px"
            });
            $(button_string).hide();
            $(button_string).prop("disabled",true);
        }
    });
}





