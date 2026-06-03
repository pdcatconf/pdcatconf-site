$(function(){

    $('.special-track').hover(
        function(){
            $('.special-track-menu').show();
        },
        function(){}
    );

    $('.special-track-menu').hover(
        function(){},
        function(){
            $(this).hide();
        }
    );

});