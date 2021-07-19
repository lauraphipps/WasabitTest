
// find all relations from sub categories to parent categories and count its for two types: one-to-one and ony-to-many
var countAllRelationsOfCategories = function(subcategories) {
	var counts = {
		oneToOne: 0,
		oneToMany: 0
	};

	// if subcategories are not array or not set - return null
	if (!Array.isArray(subcategories)) {
		return null;
	}

	// loop and count all relations
	subcategories.forEach(function(cat) {
		// if parent_categories array has 1 ID - this is one to one relation
		if (cat.parent_categories.length === 1) {
			counts.oneToOne++;
		}
		// if parent_categories array has more then 1 ID - this is one to many relation
		else if (cat.parent_categories.length > 1) {
			counts.oneToMany++;
		}
	});

	// return counts object
	return counts;
}

var loadCategoriesAndCountRelations = function() {
	// load all categories JSON data
	getCategoriesData(function(data) {
		var relationCounts = countAllRelationsOfCategories(data.childs);
		console.log(relationCounts);
	});
}

// remove parent category from categories list
var removeParentCategoryFromDOM = function(categoryID) {
	if (typeof categoryID !== 'string') {
		console.log('not valid category id');
		return false;
	}

	var $parentCategory = document.getElementById('categories-menu-item-' + categoryID);

	if ($parentCategory) {
		$parentCategory.parentNode.removeChild($parentCategory);
	} else {
		console.log('Parent category ' + categoryID + ' is not found');
	}
}