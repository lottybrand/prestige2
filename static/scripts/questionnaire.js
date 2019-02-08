
$(document).ready(function() {

	// get the participant
	ppt = dallinger.get('/participant/' + dallinger.identity.participantId);
	ppt = ppt.done(function(resp) {
		score = resp.participant.property1;
		bonus = resp.participant.property2;
		$("#score_info").html(score);
		if (bonus == "true") {
     		bonus_eligible = '/100 and will receive the $20 bonus payment!';
 		} else {
     		bonus_eligible = '/100 but unfortunately you did not score enough points for the bonus payment';
 		}
 		$("#bonus_info").html(bonus_eligible);
	})
});


