
process_good_luck = function() {
	console.log("*** getting info choice");
    info_choice();    
}


update_question_number_text = function() {
	$("#question_number").html("You are in the " + topic + " Round, on question " + number + "/100");
}

