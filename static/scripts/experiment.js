var my_node_id;
var most_recent_question = 0;
var player_id;

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

        reqwest({
            url: "/info/" + my_node_id,
            method: 'post',
            data: {
                contents: response,
                info_type: "Info"
            },
            success: function (resp) {
                if (infos.length < 11) {
                    get_info();
                } else {
                    create_agent();
                }
            }
        });
    });

    $("#submit-a").click(function() {
        disable_buttons();
        submit_response($("#submit-a").text());
    });

    $("#submit-b").click(function() {
        disable_buttons();
        submit_response($("#submit-b").text());
    });

    $("#submit-copy").click(function() {
        disable_buttons();
        submit_response($("#submit-copy").text());
    });

});


disable_buttons = function() {
    $("#submit-a").addClass('disabled');
    $("#submit-b").addClass('disabled');
    $("#submit-copy").addClass('disabled');
    $("#question").html("Waiting for other players to catch up.");
    $("#neighbors").addClass('disabled');
}

enable_buttons = function() {
    $("#submit-a").removeClass('disabled');
    $("#submit-b").removeClass('disabled');
    $("#submit-copy").removeClass('disabled');
    $("#neighbors").removeClass('disabled');
}

submit_response = function(response) {
    reqwest({
        url: "/info/" + my_node_id,
        method: 'post',
        data: {
            contents: response,
            info_type: "Info",
            property1: number,
        },
        success: function (resp) {
            most_recent_question = number;
            setTimeout(function(){
                get_info();
            }, 1000);
        }
    });
}

// Create the agent.


var create_agent = function() {
    reqwest({
        url: "/node/" + participant_id,
        method: 'post',
        type: 'json',
        success: function (resp) {
            my_node_id = resp.node.id;
            my_network_id = resp.node.network_id;
            letter_array = ["A", "B", "C", "D", "E"]
            network_letter = letter_array[my_network_id - 1]
            player_id = network_letter+my_node_id
            $("#welcome").html("Welcome to our quiz, you are player " + player_id);
            get_info(my_node_id);
        },
        error: function (err) {
            console.log(err);
            errorResponse = JSON.parse(err.response);
            if (errorResponse.hasOwnProperty('html')) {
                $('body').html(errorResponse.html);
            } else {
                allow_exit();
                go_to_page('questionnaire');
            }
        }
    });
};

var get_info = function() {
    console.log("checking for infos...");
    reqwest({
        url: "/node/" + my_node_id + "/received_infos",
        method: 'get',
        type: 'json',
        success: function (resp) {
            infos = resp.infos;
            if (infos.length > 0) {
                info = resp.infos[resp.infos.length-1].contents;
                if (info == "Bad Luck") {
                    // give feedback here somehow?
                    $("#badluck").html("Sorry, everyone chose to copy, so no one can score points");
                    submit_response("Bad Luck");
                } else if (info == "Good Luck") {
                    // thought I could use length(neighbors) but it didn't work
                    $("#goodluck").html("You have x many people to copy from,");
                    check_neighbors();
                } else {
                    question_json = JSON.parse(info);
                    question = question_json.question;
                    Wwer = question_json.Wwer;
                    Rwer = question_json.Rwer;
                    number = question_json.number;
                    topic = question_json.topic;
                    if (number != most_recent_question) {
                        $("#question").html(question);
                        $("#question_number").html("You are on question " + number);
                        $("#topic").html("of the " + topic + " topic");
                        $("#submit-a").html(Wwer);
                        $("#submit-b").html(Rwer);
                        enable_buttons();
                    } else {
                        setTimeout(function(){
                            get_info();
                        }, 1000);
                    }
                }
            } else {
                setTimeout(function(){
                    get_info();
                }, 1000);
            }
        },
        error: function (err) {
            console.log(err);
            var errorResponse = JSON.parse(err.response);
            $('body').html(errorResponse.html);
        }
    });
};

var check_neighbors = function() {
    reqwest({
        url: "/node/" + my_node_id + "/neighbors",
        method: 'get',
        type: 'json',
        data: {connection: "from"},
        success: function (resp) {
            neighbors = resp.nodes;
            $("#neighbors").html(neighbors[1].participant_id);
            console.log(neighbors[1].participant_id);
            submit_response("copied");
            enable_buttons();
            get_info();
        }
    });
};

