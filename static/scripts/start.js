
// this function runs immediately once the page is loaded
$(document).ready(function() {
    create_agent();
});

// Create the agent.
// This is called by the exp.html page to start the experiment.
create_agent = function() {
    dallinger.createAgent()
    .done(function (resp) {
        my_node_id = resp.node.id;
        store.set("node_id", my_node_id);
        my_network_id = resp.node.network_id;
        store.set("network_id", my_network_id);
        store.set("node_name", JSON.parse(resp.node.property1).name);
        get_source();
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

get_source = function() {
    url = "/node/" + my_node_id + "/neighbors"
    data = {
        connection: "from",
        node_type: "QuizSource"
    }
    dallinger.get(url, data).done(function(resp) {
        my_source_id = resp.nodes[0].id;
        store.set("source_id", my_source_id);
        get_group();
    })
}

get_group = function() {
    url = "/node/" + my_source_id + "/neighbors"
    dallinger.get(url).done(function(resp) {
        size_so_far = resp.nodes.length
        $("#question").html("Waiting for other players to join. Currently there are " + size_so_far + "/10 players. <br> <br> Please do not refresh your page.");

        url = "/network/" + my_network_id;
        dallinger.get(url).done(function(resp) {
            full = resp.network.full
            setTimeout(function() {
                if (full == true) {
                    dallinger.allowExit();
                    dallinger.goToPage('practice');
                } else {
                    get_source();
                }
            }, 1000);
        })
        .fail(function(rejection) {
            setTimeout(function() {
                get_source();
            }, 5000);
        });
    });
 };
