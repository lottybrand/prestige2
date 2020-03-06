// this function runs immediately once the page is loaded
$(document).ready(function() {

    // initially hide all divs except the welcome div
    $("#wait_div").show();

    // Add functionality to buttons controlling participants answers
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
        stop_countdown();
        $("#question_div").hide();
        $("#wait_div").show();
        submit_response(response=$(answer).text());
    }

    add_neighbor_buttons();
    get_details_from_store();
    get_transmissions();
});

stop_countdown = function() {
    clearTimeout(answer_timeout);
    $("#countdown").html("");
}

// allows variables to be passed between pages
get_details_from_store = function() {
    my_node_id = store.get("node_id");
    my_network_id = store.get("network_id");
    condition = store.get("condition");
    $("#welcome").html("Welcome to our quiz, you are player " + store.get("node_name"));
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
                t = transmissions[0];
                transmissions.forEach(function(transmission) {
                    if (transmission.id > t.id) {
                        t = transmission;
                    }
                });
                console.log("*** Got multiple transmissions, newest has info id: " + t.info_id);
                get_info(t.info_id);
            } else {
                console.log("*** Got one transmission, info id: " + transmissions[0].info_id);
                get_info(transmissions[0].info_id);
            }
        } else {
            console.log("*** Got 0 transmissions, waiting 1s and repeating");
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
    console.log("*** Processing info");
    if (info.contents == "Bad Luck") {
        console.log("*** info was bad luck");
        $("#wait_div").hide();
        $("#bad_luck_div").show();
        setTimeout(function() {
            $("#bad_luck_div").hide();
            submit_response(response="Bad Luck",
                            copy=undefined,
                            info_chosen=undefined,
                            human=false);
        }, 3000);

    // a contents of "Good luck" indicates you chose to copy, but not everyone else did.
    // depending on the round and condition different things will happen
    } else if (info.contents == "Good Luck") {
        console.log("*** Info was good luck");
        process_good_luck();

    // Any other contents indicates its a question from the source.
    } else {
        // get question details
        console.log("*** Info is a question");
        parse_question(info);

        display_question_or_warning();
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
    update_question_number_text()
    
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
    
    countdown = 15;
    $("#countdown").html(countdown);

    $("#wait_div").hide();
    $("#welcome_div").hide();
    $("#question_div").show();
    start_answer_timeout();
}

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
            "human": human,
            "topic": topic
        })
    }).done(function (resp) {
        response_submitted(resp);
    })
    .fail(function (rejection) {
        dallinger.error(rejection);
    });
}

start_answer_timeout = function() {
    answer_timeout = setTimeout(function() {
        countdown = countdown - 1;
        $("#countdown").html(countdown);
        if (countdown <= 0) {

            $("#question_div").hide();
            $("#countdown").html("");
            $("#wait_div").show();

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
    // update neighbor prompt
    if (neighbors.length == 1) {
        part1 = ("You have " + neighbors.length + " player to copy from, ");
        if (info_chosen == "Topic Score") { 
            part2 = "below is their topic score.";
        } else if (info_chosen == "Times Chosen on This Topic") {
            part2 = "below is how many times they were chosen in Round 1 on this topic.";
        } else if (info_chosen == "Times Chosen Altogether") {
            part2 = "below is how many times they were chosen in Round 1 altogether.";
        } else if (info_chosen =="Times Chosen on a Different Topic") {
            part2 = "below is how many times they were chosen in Round 1 on a different topic"
        }
    } else {
        part1 = ("You have " + neighbors.length + " players to copy from, ");
        if (info_chosen == "Topic Score") { 
            part2 = "below are their topic scores.";
        } else if (info_chosen == "Times Chosen on This Topic") {
            part2 = "below are how many times they were chosen in Round 1 on this topic.";
        } else if (info_chosen == "Times Chosen Altogether") {
            part2 = "below are how many times they were chosen in Round 1 altogether.";
        } else if (info_chosen == "Times Chosen on a Different Topic") {
            part2 = "below are how many times they were chosen in Round 1 on a different topic"
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

update_neighbor_button = function(number, neighbor) {
    // get neighbor properties, and button details
    neighbor_properties = JSON.parse(neighbor.property1);
    var scores = {
        "Geography": neighbor_properties.asoc_score_geog,
        "Weight": neighbor_properties.asoc_score_weight,
        "Language": neighbor_properties.asoc_score_lang,
        "Art": neighbor_properties.asoc_score_art
    };
    var copies = {
        "Geography": neighbor_properties.n_copies_geog,
        "Weight": neighbor_properties.n_copies_weight,
        "Language": neighbor_properties.n_copies_lang,
        "Art": neighbor_properties.n_copies_art
    };
    button_id = "#neighbor_button_" + current_button;
    neighbor_image = "<img src='/static/images/stick.png' height='90' width='50'><br>";

    // update button and question display according to info_chosen
    if (info_chosen == "Topic Score" && round !==0) {
        $(button_id).html(neighbor_image + topic + " Score: " + "<font size='5'>" + scores[topic] + "</font>" + " correct");
    } else if (info_chosen =="Topic Score" && round ==0) {
        $(button_id).html(neighbor_image + topic + " Score: " + "<font size='5'> 0 </font>" + " correct");
    } else if (info_chosen == "Times Chosen on This Topic") {
        $(button_id).html(neighbor_image + "chosen " + "<font size='5'>" + copies[topic] + "</font>" + " times in the " + topic + " topic");
    } else if (info_chosen == "Times Chosen Altogether") {
        $(button_id).html(neighbor_image + "chosen " + "<font size='5'>" + neighbor_properties.n_copies + "</font>" + " times altogether in Round 1");
    } else if (info_chosen == "Times Chosen on a Different Topic") {
        if (number == 1) {
            var topics = ["Geography", "Art", "Language", "Weight"];
            var other_topics = topics.filter(function(t, index, arr){ return t != topic; });
            random_topic = other_topics[Math.floor(Math.random() * other_topics.length)];
        }
        $(button_id).html(neighbor_image + "chosen " + "<font size='5'>" + copies[random_topic] + "</font>" + " times in the " + random_topic + " topic");
    }

    // add button functionality
    $(button_id).click(function() {
        submit_response(response=neighbor.id,
                        copy=true,
                        info_chosen=info_chosen);
        disable_neighbor_buttons();
        $("#neighbor_div").hide();
    });
    $(button_id).prop("disabled", false);
    $(button_id).show();
};

disable_neighbor_buttons = function() {
    for (i = 1; i <= group_size-1; i++) {
        button_string = "#neighbor_button_" + i;
        $(button_string).html("");
        $(button_string).hide();
        $(button_string).prop("disabled",true);
        $(button_string).off("click");
    }
    $("#question").html("Waiting for other players to catch up.");
}

hide_pics = function() {
    $("#pics").hide();
}

show_pics = function(number) {
    $("#pics").attr("src", "/static/images/" + number + ".png");
    $("#pics").show();
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

get_source = function() {
    url = "/node/" + my_node_id + "/neighbors"
    data = {
        connection: "from",
        node_type: "QuizSource"
    }
    dallinger.get(url, data).done(function(resp) {
        console.log("pinged server");
    });
}




