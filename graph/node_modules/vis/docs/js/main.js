$(document).ready(function() {

  vis.createBreadcrumbs($(".container.full").first());
  vis.initSiteSearch();
  vis.initKeywords();

  $("#tipue_search_input").keyup(checkInput)
  vis.typingTimeout = 0;
      
});

function checkInput() {
  if (document.getElementById("tipue_search_input").value.length > 3) {
    clearTimeout(vis.typingTimeout);
    vis.typingTimeout = setTimeout(function () {vis.initSiteSearch(true)},200);
  }
  else {
    var title = document.title.replace(/(\(.+\) )/g,"");
    document.title = title;
    document.getElementById("search-results-wrapper").style.display = "none";
  }
}

// namespace
var vis = {};

/**
 * Adds a breadcrumb as first child to the specified container.
 * 
 * @author felixhayashi
 */
vis.createBreadcrumbs = function(container) {
    
  // use the url to infer the path
  var crumbs = location.pathname.split('/');
  
  // number of ancestor directories
  var stepbackIndex = crumbs.length-1;
  var breadcrumbs = $.map(crumbs, function(crumb, i) {
    
    // first and last element of the split
    if(!crumb) return;
    
    stepbackIndex--;
    
    if(/\.html$/.test(crumb)) {
      
      // strip the .html to make it look prettier
      return "<span>" + crumb.replace(/\.html$/, "") + "</span>";
      
    } else {
            
      // calculate the relative url
      for(var ref=crumb+"/", j=0; j<stepbackIndex; j++, ref="../"+ref);
      
      return "<a href='" + ref + "'>" + crumb + "</a>";
    }
  }).join("") || "Home";

  // insert into the container at the beginning.
  $(container).prepend("<div id=\"breadcrumbs\">" + breadcrumbs + "</div>");
  
};

/**
 * Will load tipue search field.
 * If the search has already begun, we also display the results.
 * 
 * For information how it works:
 * @see https://github.com/almende/vis/issues/909#issuecomment-120119414
 * @see https://github.com/almende/vis/issues/909#issuecomment-120397562
 * 
 * @author felixhayashi
 */
vis.initSiteSearch = function(dynamic) { // Added dynamic flag for live update ~ Alex
  $("#tipue_search_input").tipuesearch({
    "mode": "live",
    "show": 3,
  },dynamic);


  var hasSearchMessage = $("#tipue_search_content").children().length > 0;
  if(hasSearchMessage) {
    // show result panel
    if ($("#search-results-wrapper").css("display") === 'none') {
      $("#search-results-wrapper").css("display", "block");
    }
    // encode the keywords that were entered by the user
    var keywords = $("#tipue_search_input").val().replace(/\s/g, ",");
    // add keywords to result-urls
    $(".tipue_search_content_url a, .tipue_search_content_title a").each(function() {
      $(this).attr("href", $(this).attr("href") + "?keywords=" + keywords);
    });
  } else {
    $("#search-results-wrapper").css("display", "none");
  }
  
};

/**
 * Will highlight the keywords that are passed as url get-parameters.
 * All keywords are higlighted and a panel is displayed to jump to the
 * first keyword found.
 * 
 * For information how it works:
 * @see https://github.com/almende/vis/issues/909#issuecomment-120119414
 * @see https://github.com/almende/vis/issues/909#issuecomment-120397562
 * 
 * @author felixhayashi
 */
vis.initKeywords = function() {
      
  // extract keywords from get-variable
  var keywords = url("?keywords");
  
  if(keywords) {
  
    // highlighting all keywords
    keywords = keywords.split(",");
    for(var i = 0; i < keywords.length; i++) {
      $("body").highlight(keywords[i]);
    }
    
    // nasty hack: programmatically open full options tab
    // because no browser allows scrolling to hidden elements!
    $("[role=presentation][targetnode=fullOptions]").click();
    $("tr.toggle:not(collapsible)").click();
    
    // init keyword info panel
    $("#keyword-info").css("display", "block");
    $("#keyword-count").text($(".highlight").length);
    $("#keyword-jumper-button").on('click', function(event) {
      event.preventDefault();
      // do not cache hits outside the handler; creates problems with prettyfy lib
      // we use the first visible(!) hit at the time the button is clicked
      var firstHit = $(".highlight:visible").first();
      if(firstHit.length) {
        $("html, body").animate({ scrollTop: $(firstHit).offset().top }, 2000);
      }
    });    
   
  }
  
};