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

// when submit response is submitted, then the contents are posted as an info for that node?
       reqwest({
            url: "/info/" + my_node_id,
            method: 'post',
            data: {
                contents: response,
                info_type: "Info"
            },
            //I don't think the below was doing anything, nothing seemed to change when I commented out
            // success: function (resp) {
            //     // if the length of the infos is less than 11 then get another info, otherwise go back to create agent?
            //     // must be leftover from when I was trying things out with ten questions. 
            //     if (infos.length < 11) {
            //         get_info();
            //     } else {
            //         create_agent();
            //     }
            // }
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
    });
}


//not entirely sure what this does
submit_response = function(response) {
    dallinger.createInfo(my_node_id, {
        contents: response,
        info_type: "Info",
        property1: number
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
        $("#badluck").html("Sorry, everyone chose to copy, so no one can score points");
        submit_response("Bad Luck");
    } else if (info.contents == "Good Luck") {
        // if there are people to copy you check your neighbors
        $("#goodluck").html("You have x many people to copy from,");
        check_neighbors();
    } else {
        // if you have received a question
        question_json = JSON.parse(info.contents);
        question = question_json.question;
        Wwer = question_json.Wwer;
        Rwer = question_json.Rwer;
        number = question_json.number;
        topic = question_json.topic;
        $("#question").html(question);
        $("#question_number").html("You are on question " + number);
        $("#topic").html("of the " + topic + " topic");
        $("#submit-a").html(Wwer);
        $("#submit-b").html(Rwer);
        enable_buttons();
    }
};

var check_neighbors = function() {
    reqwest({
        url: "/node/" + my_node_id + "/neighbors",
        method: 'get',
        type: 'json',
        data: {connection: "from"},
        success: function (resp) {
            neighbors = resp.nodes;
            current_button = 1;
            neighbors.forEach(function(entry) {
                if (entry.type != "quiz_source") {
                    button_id = "#neighbor_button_" + current_button;
                    $(button_id).html(entry.property1);
                    $(button_id).click(function() {
                        submit_response($(this).text());
                        disable_buttons();
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


disable_buttons = function() {
    $("#submit-a").addClass('disabled');
    $("#submit-b").addClass('disabled');
    $("#submit-copy").addClass('disabled');
    $("#question").html("Waiting for other players to catch up.");
    $("#neighbor_buttons").off('click');
    //$element.off("click");
}

enable_buttons = function() {
    $("#submit-a").removeClass('disabled');
    $("#submit-b").removeClass('disabled');
    $("#submit-copy").removeClass('disabled');
    $("#neighbor_buttons").removeClass('disabled');
}
