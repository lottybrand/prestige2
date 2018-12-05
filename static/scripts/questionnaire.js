$(document).ready(function() {

	// get the participant
	ppt = dallinger.get('/participant/' + dallinger.identity.participantId);
	ppt = ppt.done(function(resp) {
		score = resp.participant.property1;
		bonus = resp.participant.property2;
		$("#score_info").html(score);
		$("#bonus_info").html(bonus);
	})

});