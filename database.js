var $template = $('#Room1').clone()

function addRoom(){
  var roomNum = $("#rooms li").length +1
  var cache = $template.children();
    $template.text('Room '+ roomNum).append(cache);
  	$template.attr("id","Room"+roomNum)
    $template.data("room", roomNum)
    $template.find("slot0").val("bernard")
  $('#rooms').append($template.clone())
}
