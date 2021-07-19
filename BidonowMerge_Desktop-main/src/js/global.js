var app = {

	getJSON: function(requestUrl, onSuccess) {
		onSuccess = typeof onSuccess == 'function' ? onSuccess : function() {};

		// create new server request
		var request = new XMLHttpRequest();
		// set json response type
		request.overrideMimeType('application/json');
		// set method type and data url
		request.open('GET', requestUrl, true);

		// run after data was loaded
		request.onload  = function() {
			if (
				request.status === 200 // response status OK
				&&
				request.readyState === 4 // request is DONE
			) {
				// try to parsing request as JSON format
				var jsonData = null;

				try {
					jsonData = JSON.parse(request.responseText);
				} catch(e) {
					console.error('json parse error', e);
					jsonData = null;
				}
			}

			if (jsonData) {
				// if we success got and parsed data - sending it to success event
				onSuccess(jsonData);
			}
		}

		// start request
		request.send(null);
	},

	// load svg source code and set it as HTML to sender element
	setSvgByUrl: function(svgUrl, element) {

		// if element not sended or this is not HTMLElement - return
		if (!(element instanceof HTMLElement)) {
			return false;
		}

		// create new server request
		var request = new XMLHttpRequest();
		// set json response type
		request.overrideMimeType('image/svg+xml');
		// set method type and data url
		request.open('GET', svgUrl, true);
		// run after data was loaded
		request.onload  = function() {
			if (
				request.status === 200 // response status OK
				&&
				request.readyState === 4 // request is DONE
			) {
				element.innerHTML = request.responseText;
			}
		}

		// start request
		request.send(null);
	},

	popup: (function() {

		// create wrapper for popup, add it as child to document.body and open
		var buildPopup = function(element) {

			// check if element is not HTMLElement - exit
			if (!(element instanceof HTMLElement)) {
				return false;
			}

			// adding helper class for popup element content
			element.classList.add('popup--element');

			// attach close event to close button
			var popupCloseBtns = element.querySelectorAll('.popup--close');

			for (var i = 0; i < popupCloseBtns.length; i++) {
				popupCloseBtns[i].removeEventListener('click', closePopupEvent);
				popupCloseBtns[i].addEventListener('click', closePopupEvent);
			}

			// create helper for save element DOM position. it will using for append back element after popup closed
			var currentElementPlacer = document.createElement('span');
			currentElementPlacer.className = 'popup--position';

			// add DOM position helper before popup element
			element.parentNode.insertBefore(currentElementPlacer, element);

			// create popup wrapper
			var popupWrap = document.createElement('div');
			popupWrap.className = 'popup-wrapper popup--wrapper';

			// create popup overlay
			var popupOverlay = document.createElement('div');
			popupOverlay.className = 'popup-overlay';

			// close popup by overlay clicking
			popupOverlay.addEventListener('click', closePopup);

			// append overlay to popup
			popupWrap.appendChild(popupOverlay);

			// append popup element content to popup
			popupWrap.appendChild(element);

			// add class to document.body that mean about contains of popup
			document.body.classList.add('has-popup');

			// append popup element to end of body
			document.body.appendChild(popupWrap);

			return popupWrap;
		}

		// close popup helper for links and buttons with prevent default action
		var closePopupEvent = function(e) {
			e.preventDefault();
			closePopup();
		}

		// close current popup if it isset
		var closePopup = function() {
			// get active popup wrapper element
			var popupWrapper = document.querySelector('.popup--wrapper');
			// get saving before popup DOM position
			var defaultPopupPosition = document.querySelector('.popup--position');

			if (popupWrapper && defaultPopupPosition) {
				var currentPopupElement = popupWrapper.querySelector('.popup--element');

				if (currentPopupElement) {
					// restore popup DOM position
					defaultPopupPosition.parentNode.insertBefore(currentPopupElement, defaultPopupPosition);

					// remove helper element
					defaultPopupPosition.parentNode.removeChild(defaultPopupPosition);

					// remove popup wrapper
					popupWrapper.parentNode.removeChild(popupWrapper);

					// remove class from document.body that mean about contains of popup
					document.body.classList.remove('has-popup');
				}
			}
		}

		// global functions
		return {
			// open popup by HTMLElement or element selector
			open: function(element, config) {

				var popupElement = typeof element === 'string' ? document.querySelector(element) : (
					element instanceof HTMLElement ? element : null
				);

				config = config || {};

				// if element was not finding - show log message about it and exit
				if (!popupElement) {
					console.log('No element popup found');
					return false;
				}

				// close opened popup before open new
				this.close();

				// build new popup
				var popupWrap = buildPopup(popupElement);

				if (popupWrap) {
					config.afterOpen && config.afterOpen(popupWrap);
				}
			},

			close: closePopup
		}

	})(),

	isObject: function(value) {
		return typeof value === 'object' && value !== null;
	},

	autocomplete: function(input, options) {
		// get element by selector or HTMLElement
		var $input = typeof input === 'string' ? document.querySelector(input) : (
			input instanceof HTMLElement ? input : null
		);

		// if no $input element - exit
		if (!$input) {
			return false;
		}

		if (!app.isObject(options)) {
			options = {};
		}

		// max showing items in results list
		options.maxShowingResults = 'maxShowingResults' in options ? options.maxShowingResults : 10;

		// path of object keys
		options.sourceDataKeys = options.sourceDataKeys || {
			id: 'id',
			text: 'name',
		};

		// render icon function. need to return DOM element. if null - not render icon
		options.renderResultRowIcon = options.renderResultRowIcon || null;
		// render text of each row. need to return text or HTML
		options.renderResultRowText = options.renderResultRowText || function(row) {
			return row[options.sourceDataKeys.text];
		};

		// store cached data loaded from firstly ajax (json) request
		var cachedData = null;

		// load JSON file via ajax request
		var loadJsonFile = function(onResultsGet) {
			if (cachedData) {
				console.time('return json cached data');
				// return cached data
				onResultsGet(cachedData);
				console.timeEnd('return json cached data');
			} else {
				console.time('first json file loading');
				app.getJSON(options.sourceUrl, function(data) {

					// cache original data and filtered&sorting data
					cachedData = {
						filtered: sortingDataByNameABS(options.sourceItemsPath(data)),
						original: data
					};

					// return loaded data
					onResultsGet(cachedData);
				});
				console.timeEnd('first json file loading');
			}
		}

		// find rows in filtered data by text query
		var findRowsByQuery = function(query, data) {
			var results = {};
			var resultsCount = 0;

			for (var i = 0; i < data.length; i++) {
				if (data[i][options.sourceDataKeys.text].toLowerCase().indexOf(query) !== -1) {
					// inc found items
					resultsCount++;
					// set found data to results object by data ID
					results[ data[i][options.sourceDataKeys.id] ] = data[i];

					// if found results equals or more then maxShowingResults - then stop
					if (resultsCount >= options.maxShowingResults) {
						break;
					}
				}
			}

			return results;
		}

		// sorting filtered data by text ASC
		var sortingDataByNameABS = function(data) {
			return data.sort(function(a, b) {
				var textA = a[options.sourceDataKeys.text].toLowerCase(); // convert name from first item to lower case
				var textB = b[options.sourceDataKeys.text].toLowerCase(); // convert name from second item to lower case

				return textA < textB ? -1 : (
					textA > textB ? 1 : 0
				);
			});
		}

		// get all data from different sources
		var findResultsInSource = function(query, onResultsGet) {
			switch (options.sourceType) {
				case 'json':
					loadJsonFile(function(datas) {
						onResultsGet(
							findRowsByQuery(query, datas.filtered),
							datas.filtered,
							datas.original
						);
					});
					break;
				default:
					console.log('no source type set');
			}
		}

		// start searching the results
		var findByQuery = function(query) {
			query = query.toLowerCase().trim();

			if (query.length) {
				findResultsInSource(query, function(foundRows, filteredData, allData) {
					// render founded results in dropdown
					dropdown.renderResults(foundRows, filteredData, allData);
				});
			} else {
				// clear dropdown for non query set
				dropdown.clear();
			}
		}

		// select row and set selected text
		var selectRow = function(data) {
			$input.value = data[options.sourceDataKeys.text];
			dropdown.remove();
		}

		var dropdown = {
			// cached dropdown element
			element: null,

			// live updating of dropdown position by $input position
			updatePosition: function() {
				var y = $input.offsetTop - window.pageYOffset;
				var x = $input.offsetLeft - window.pageXOffset;
				var h = $input.offsetHeight;
				var w = $input.offsetWidth;

				dropdown.element.style.top = y + h + 'px';
				dropdown.element.style.left = x + 'px';
				dropdown.element.style.width = w + 'px';
			},

			// render result items in dropdown
			renderResults: function(foundResults, filteredData, allData) {
				var currentData;

				// firstly remove all dropdown data then rendered before
				this.clear();

				for (var rowResultID in foundResults) {
					currentData = foundResults[rowResultID];

					// render $icon element if renderResultRowIcon return it
					var $icon = options.renderResultRowIcon ? options.renderResultRowIcon(currentData, filteredData, allData) : null;

					// create dropdown item DOM element and append to dropdown
					if (this.element) {
						this.element.appendChild(
							DOM('div', {className: 'autocomplete-item'}, [

								$icon ? DOM('span', {className: 'autocomplete-item-icon'}, [$icon]) : null,

								DOM('a', {
									href: '#',
									className: 'autocomplete-item-link',
									innerHTML: options.renderResultRowText(currentData, filteredData, allData),
									data: {
										id: rowResultID
									},
									on: {
										click: function(e) {
											e.preventDefault();
											selectRow(foundResults[rowResultID]);
										}
									}
								})

							])
						);
					}
				}
			},

			create: function() {
				if (!this.element) {
					// create dropdown DOM element
					this.element = DOM('div', {className: 'autocomplete-dropdown'});
					// append dropdown element to page
					document.body.appendChild(this.element);
					// update dropdown position on resize page event
					window.addEventListener('resize', this.updatePosition);
					// update dropdown position on scroll page event
					window.addEventListener('scroll', this.updatePosition);
					// attach event for close dropdown by clicking for elements except current input and dropdown
					document.addEventListener('click', this.eventDocumentClickDropdownClose);
				}
			},

			remove: function() {
				if (this.element) {
					// remove dropdown element from DOM
					this.element.parentNode.removeChild(this.element);
					this.element = null;
					// update dropdown position on resize page event
					window.removeEventListener('resize', this.updatePosition);
					// update dropdown position on scroll page event
					window.removeEventListener('scroll', this.updatePosition);
					// remove event for close dropdown by clicking on elements except current input and dropdown
					document.removeEventListener('click', this.eventDocumentClickDropdownClose);
				}
			},

			clear: function() {
				if (this.element) {
					// remove all dropdown items
					this.element.innerHTML = '';
				}
			},

			// close dropdown by clicking on page elements, except elements that contains to dropdown
			eventDocumentClickDropdownClose: function(e) {
				if (e.target !== $input) {
					var $dropdownsParent = e.target.closest('.autocomplete-dropdown');

					if (!$dropdownsParent || $dropdownsParent !== dropdown.element) {
						dropdown.remove();
					}
				}
			}
		}

		// create dropdown by input focus
		$input.addEventListener('focus', function() {
			dropdown.create();
			dropdown.updatePosition();
			findByQuery(this.value);
		});

		// start finding results by 'input' event
		$input.addEventListener('input', function() {
			dropdown.create();
			findByQuery(this.value);
		});
	},

}

/**
 * create DOM Element with arguments and childs
 * DOM('div', {className: 'class-of-element', on: {'scroll wheel': function() {}}}, [
 *     DOM('span', {innerHTML: 'inline text element'})
 * ]);
 * @return Element
 */
var DOM = function(tagName, attrs, childs) {
	attrs = app.isObject(attrs) ? attrs : {};
	childs = Array.isArray(childs) ? childs : [];

	// create element by tag name
	var elem   = document.createElement(tagName);
	var events = null;
	var extendFunc = null;

	// if attrs contains 'on' object - using this object for events.
	// events can be multiple, with space in keys ('mouseenter mouseleave': function() {})
	if ('on' in attrs && app.isObject(attrs.on)) {
		events = attrs.on;
		delete attrs.on;
	}

	if ('extend' in attrs && typeof attrs.extend === 'function') {
		extendFunc = attrs.extend;
		delete attrs.extend;
	}

	// set element attributes
	for (var attr in attrs) {
		if (attr in elem) {
			elem[attr] = attrs[attr];
		} else {
			// add dataset attributes vie {data: {}} config of attrs
			if (attr === 'data' && app.isObject(attrs[attr])) {
				for (var dataAttr in attrs[attr]) {
					elem.dataset[dataAttr] = attrs[attr][dataAttr];
				}
			} else {
				console.log(attr, attrs[attr])
				elem.setAttribute(attr, attrs[attr]);
			}
		}
	}

	// attach events for element
	if (events) {
		for (var eventsMultiName in events) {
			eventsMultiName.split(' ').forEach(function(eventName) {
				elem.addEventListener(eventName, events[eventsMultiName], false);
			});
		}
	}

	// run function for extend element
	if (extendFunc) {
		extendFunc(elem);
	}

	// append child elements to parent element
	if (childs.length) {
		childs.forEach(function(childElement) {
			if (childElement instanceof HTMLElement) {
				elem.appendChild(childElement);
			}
		});
	}

	return elem;
}