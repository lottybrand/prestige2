$(document).ready(function() {

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

});