/*global body, FormData, jQuery, console */
(function ($) {
	function init() {
		const link = $("a#main-link");
		const form = $("form");
		$("input[name=link]").keyup(function () {
			link.attr("href", this.value);
			form.attr("action", this.value);
		});
		$("input[name=mode]").keyup(function () {
			link.data("limberjax-mode", this.value);
			form.data("limberjax-mode", this.value);
		});
		$("input[name=container]").keyup(function () {
			link.data("limberjax-container", this.value);
			form.data("limberjax-container", this.value);
		});
		$("input[name=method]").keyup(function () {
			form.attr("method", this.value);
		});
	}
	$(init);
	$(document).on("limberjax:success", init);
}(jQuery));
