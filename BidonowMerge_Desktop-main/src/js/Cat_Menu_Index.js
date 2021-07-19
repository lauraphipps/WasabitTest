var USE_CATEGORIES_CACHE_BETWEEN_PAGES = false;
var USE_MINIFIED_CATEGORIES_JSON_FILE = true;
var BUILD_CATEGORIES_MENU_BY_DOM_HELPER = true;

if (!USE_CATEGORIES_CACHE_BETWEEN_PAGES) {
	localStorage.removeItem('categories.full');
}

// Load categories json data
var getCategoriesData = function(onSuccess) {

	// get data from local storage
	var localStorageData = localStorage.getItem('categories.full');

	if (localStorageData) {
		// try to parsing JSON data
		console.time('categories json loading from local storage');
		try {
			var prettyData = JSON.parse(localStorageData);

			// if parsing is success - return local storage json data
			if (prettyData) {
				// call success event for return data
				onSuccess(prettyData);

				console.timeEnd('categories json loading from local storage');
				return true;
			}
		} catch(e) {
		}
	}

	console.time('categories json loading request');

	// load JSON file locally
	app.getJSON('../data/categories'+(USE_MINIFIED_CATEGORIES_JSON_FILE ? '.min' : '')+'.json', function(data) {
		// remember json file to local storage for caching
		localStorage.setItem('categories.full', JSON.stringify(data));
		// call success event for return data
		onSuccess(data);

		console.timeEnd('categories json loading request');
	});
}

// get categories parents menus by .categories-menu--parents selector
var getCategoriesParentsMenus = function() {
	return document.querySelectorAll('.categories-menu--parents');
}

// build html sub-categories menu by parent ID
var buildSubcategoriesAlphabetList = function(parentID, afterFn) {
	afterFn = afterFn || function() {};

	// create document fragment for storing HTML items of sub-categories
	var fragment = document.createDocumentFragment();

	getCategoriesData(function(data) {
		var subcategories = {};
		var subcategoriesCount = 0;

		for (var i = 0; i < data.childs.length; i++) {
			// if ths loop childs has relation to parentID
			if (data.childs[i].parent_categories.indexOf(parentID) !== -1) {
				// get first letter from category name
				var firstChar = data.childs[i].name[0];

				// create array for sub-categories objects in CHAR key object
				if (!(firstChar in subcategories)) {
					subcategories[firstChar] = [];
				}

				// add sub-category data into sub-categories array by char
				subcategories[firstChar].push({
					id: data.childs[i].id,
					name: data.childs[i].name
				});

				// increment sub-categories count
				subcategoriesCount++;
			}
		}

		var alphabet = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

		for (var i = 0; i < alphabet.length; i++) {
			var char = alphabet[i];

			// create char element for sub-categories list
			var charElement = document.createElement('li');
			charElement.innerHTML = char;
			charElement.className = 'categories-list-char';
			charElement.dataset.char = char.toLowerCase();

			// append char element to HTML fragment
			fragment.appendChild(charElement);

			if (char in subcategories) {
				// sorting current array by name ASC
				var items = subcategories[char].sort(function(a, b) {
					var nameA = a.name.toLowerCase(); // convert name from first item to lower case
					var nameB = b.name.toLowerCase(); // convert name from second item to lower case

					return nameA < nameB ? -1 : (
						nameA > nameB ? 1 : 0
					);
				});

				for (var j = 0; j < items.length; j++) {
					var categoryListItem = document.createElement('li');
					categoryListItem.className = 'categories-list-item';

					var categoryListLink = document.createElement('a');
					categoryListLink.href = '#';
					categoryListLink.innerHTML = items[j].name;
					categoryListLink.className = 'categories-list-link';
					categoryListLink.dataset.id = items[j].id;

					categoryListItem.appendChild(categoryListLink);
					fragment.appendChild(categoryListItem);
				}
			} else {
				var notFoundElement = document.createElement('li');
				notFoundElement.className = 'categories-list-not-found';
				notFoundElement.innerHTML = 'Not Found';

				fragment.appendChild(notFoundElement);
			}
		}

		afterFn({
			fragment: fragment,
			total: subcategoriesCount
		});
	});
}

// find and return parent category data from JSON file
var getParentCategoryById = function(id, afterFn) {
	afterFn = afterFn || function() {};

	getCategoriesData(function(data) {
		if (id in data.parents) {
			afterFn(data.parents[id]);
		}
	});
}

// open sub categories modal by parent ID
var openSubCategoriesByParent = function(parentID) {

	// set active CHAR class for categories alphabet list
	var setActiveCategoryAlphabetChar = function($popup, char) {
		var $nextActiveAlphabetChar  = $popup.querySelector('.categories-alphabet--char[data-char="'+char+'"]');
		var $prevActiveAlphabetChars = $popup.querySelectorAll('.categories-alphabet--char.active');

		// remove active class from active chars
		for (var j = 0; j < $prevActiveAlphabetChars.length; j++) {
			$prevActiveAlphabetChars[j].classList.remove('active');
		}

		if ($nextActiveAlphabetChar) {
			// add next active class
			$nextActiveAlphabetChar.classList.add('active');
		}
	}

	app.popup.open('#categories-popup', {
		afterOpen: function($popup) {
			var $list = $popup.querySelector('.categories--list');
			var $parentName = $popup.querySelector('.categories-popup--title');
			var $parentImage = $popup.querySelector('.categories-popup--icon');
			var $alphabetListChars = $popup.querySelectorAll('.categories-alphabet--char');

			// attach additional events for categories, chars, etc once
			if (!$popup.classList.contains('event-attached')) {
				$popup.classList.add('event-attached');

				for (var i = 0; i < $alphabetListChars.length; i++) {
					// attach click event for scroll sub-categories list to CHAR blocks start
					$alphabetListChars[i].addEventListener('click', function(e) {
						e.preventDefault();
						// get current char of clicked button
						var char = this.dataset.char.toLowerCase();
						// find char blocks start from sub-categories list
						var $listChar = $list.querySelector('.categories-list-char[data-char="'+char+'"]');

						if ($listChar) {
							setActiveCategoryAlphabetChar($popup, char);

							// select active scroller. if device is mobile - use $popup, else - $list
							var $scroller = window.innerWidth <= 680 ? $popup : $list;
							// scroll to char start blocks position
							$scroller.scrollTo(0, $listChar.getBoundingClientRect().top - $scroller.getBoundingClientRect().top + $scroller.scrollTop);
						}
					});
				}

				var listScrollCharMoveTimeout = null;

				// attach scroll event for select current char that user viewed
				$list.addEventListener('scroll', function(e) {

					clearTimeout(listScrollCharMoveTimeout);

					// detect it not for first scroll
					listScrollCharMoveTimeout = setTimeout(function() {

						// top scroll Y position
						var y = $list.scrollTop;
						// get all chars from sub-categories list
						var $chars = $list.querySelectorAll('.categories-list-char');

						for (var i = 0; i < $chars.length; i++) {

							// get current loop char Y position
							var charsPos = $chars[i].getBoundingClientRect().top - $list.getBoundingClientRect().top;

							// activate char in alphabet by first find of char in sub-categories list by Y scroll position
							if (charsPos >= 10) {
								setActiveCategoryAlphabetChar($popup, ($chars[i-1] ? $chars[i-1] : $chars[i]).dataset.char);
								break;
							}

						}

					}, 50);
				});
			}

			// reset active char
			setActiveCategoryAlphabetChar($popup, 'A');

			// load parent info
			getParentCategoryById(parentID, function(data) {
				// set parent name if DIV exists
				if ($parentName) {
					$parentName.innerHTML = data.name;
				}

				if ($parentImage) {
					// if icon are set - append it to icon store DIV
					if (data.icon) {
						$parentImage.style.display = 'block';
						$parentImage.src = '../images/icons/'+data.icon;
					}
					// else - hide icon store DIV
					else {
						$parentImage.style.display = 'none';
					}
				}
			});

			// clear list before adding new
			$list.innerHTML = '';

			// build sub-categories list by parent id
			buildSubcategoriesAlphabetList(parentID, function(data) {
				var $categoriesCountLabel = $popup.querySelector('.categories--count');

				// set sub-categories total label
				if ($categoriesCountLabel) {
					$categoriesCountLabel.innerHTML = data.total;
				}

				// append list of sub-categories
				$list.appendChild(data.fragment);
			});
		}
	});

}

// filter popular categories from parents categories
var getPopularsArray = function(parents) {
	// create array for populars categories
	var list = [];

	// move categories to popular array
	for (var parentID in parents) {
		var item = parents[parentID];

		if (!item.popular) {
			continue;
		}

		item.id = parentID;
		list.push(item);
	}

	// sorting popular categories by popular value
	list.sort(function(a, b) {
		return a.popular - b.popular;
	});

	return list;
}

// render popular categories parents in menus. (using filter parent.popular > 0 in JSON)
var renderPopularParents = function(parents) {
	// get menu elements
	var lists = getCategoriesParentsMenus();

	// if not lists found - exit
	if (!lists.length) {
		return false;
	}

	var listsArray = getPopularsArray(parents);

	if (BUILD_CATEGORIES_MENU_BY_DOM_HELPER) {

		console.time('BUILD_CATEGORIES_MENU_BY_DOM_HELPER === true');

		for (var i = 0; i < lists.length; i++) {
			for (var j = 0; j < listsArray.length; j++) {
				// current parent row of loop
				var parent = listsArray[j];

				lists[i].appendChild(
					DOM('li', {
						id: 'categories-menu-item-' + parent.id
					}, [
						DOM('a', {
							id: 'categories-menu-link-' + parent.id,
							href: '#',
							className: 'categories-menu-link',
							data: {
								id: parent.id // set parent ID to link data attribute
							},
							on: {
								click: function(e) {
									e.preventDefault(); // prevent default link action
									openSubCategoriesByParent(this.dataset.id); // open sub categories popup by clicked parent id
								}
							}
						}, [
							DOM('div', {innerHTML: parent.name, extend: function(element) {
								app.setSvgByUrl('../images/icons/'+parent.icon, element);
							}}),
							DOM('span', {innerHTML: parent.name})
						])
					])
				);

			}
		}

		console.timeEnd('BUILD_CATEGORIES_MENU_BY_DOM_HELPER === true');

	} else {

		console.time('BUILD_CATEGORIES_MENU_BY_DOM_HELPER === false');

		for (var i = 0; i < lists.length; i++) {

			for (var j = 0; j < listsArray.length; j++) {
				// current parent row of loop
				var parent = listsArray[j];

				var $wrap = document.createElement('li');
				var $link = document.createElement('a');
				var $linkText = document.createElement('span');
				var $icon = document.createElement('div');

				$icon.className = 'categories-menu-link-icon';

				app.setSvgByUrl('../images/icons/'+parent.icon, $icon);

				$link.href = '#';
				$link.className = 'categories-menu-link';
				$link.dataset.id = parent.id; // set parent ID to link data attribute
				$link.addEventListener('click', function(e) {
					e.preventDefault(); // prevent default link action
					openSubCategoriesByParent(this.dataset.id); // open sub categories popup by clicked parent id
				});

				$linkText.innerHTML = parent.name;

				$link.appendChild($icon);
				$link.appendChild($linkText);

				$wrap.appendChild($link);

				lists[i].appendChild($wrap);
			}
		}

		console.timeEnd('BUILD_CATEGORIES_MENU_BY_DOM_HELPER === false');

	}


}

// load json data only if DOM has parents categories menus
if (getCategoriesParentsMenus().length) {

	// load all categories data in JSON
	getCategoriesData(function(data) {
		// render categories
		renderPopularParents(data.parents);
	});

}