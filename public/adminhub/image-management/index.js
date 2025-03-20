// Refactored to use a more generic approach
function handleImageUpload(sectionId) {
	const fileInput = document.getElementById(`${sectionId}-file-input`);
	const previewContainer = document.getElementById(`${sectionId}-preview-container`);
	const uploadActions = document.getElementById(`${sectionId}-upload-actions`);
	const selectedCount = document.getElementById(`${sectionId}-selected-count`);
	const dropzone = document.getElementById(`${sectionId}-upload-dropzone`);

	// Setup event listeners for this section
	if (fileInput) {
		// File input change handler
		fileInput.addEventListener('change', function () {
			handleFiles(fileInput, previewContainer, uploadActions, selectedCount, sectionId);
		});

		// Drag & Drop functionality
		dropzone.addEventListener('dragover', function (e) {
			e.preventDefault();
			dropzone.style.borderColor = 'var(--blue)';
		});

		dropzone.addEventListener('dragleave', function () {
			dropzone.style.borderColor = 'var(--dark-grey)';
		});

		dropzone.addEventListener('drop', function (e) {
			e.preventDefault();
			dropzone.style.borderColor = 'var(--dark-grey)';

			if (e.dataTransfer.files.length > 0) {
				fileInput.files = e.dataTransfer.files;
				handleFiles(fileInput, previewContainer, uploadActions, selectedCount, sectionId);
			}
		});
	}
}

function handleFiles(fileInput, previewContainer, uploadActions, selectedCount, sectionId) {
	const files = fileInput.files;

	if (files.length > 0) {
		uploadActions.style.display = 'block';
		selectedCount.textContent = files.length;

		previewContainer.innerHTML = '';

		// Create preview for each file
		Array.from(files).forEach(function (file) {
			if (!file.type.match('image.*')) {
				return;
			}

			const reader = new FileReader();

			reader.onload = function (e) {
				const previewItem = document.createElement('div');
				previewItem.className = 'preview-item';

				const img = document.createElement('img');
				img.src = e.target.result;
				img.className = 'preview-img';

				const removeButton = document.createElement('div');
				removeButton.className = 'remove-preview';
				removeButton.innerHTML = '×';
				removeButton.addEventListener('click', function (event) {
					event.stopPropagation();
					previewItem.remove();

					// Update count
					const currentCount = document.querySelectorAll(`#${sectionId}-preview-container .preview-item`).length;
					selectedCount.textContent = currentCount;

					if (currentCount === 0) {
						uploadActions.style.display = 'none';
					}
				});

				previewItem.appendChild(img);
				previewItem.appendChild(removeButton);
				previewContainer.appendChild(previewItem);
			};

			reader.readAsDataURL(file);
		});
	}
}

function uploadSectionImages(sectionId, sectionName) {
	const previewItems = document.querySelectorAll(`#${sectionId}-preview-container .preview-item`);

	if (previewItems.length > 0) {
		const btn = document.querySelector(`#${sectionId}-upload-actions .btn-primary`);
		const originalText = btn.textContent;
		btn.textContent = 'Uploading...';
		btn.disabled = true;

		// Create a FormData object to send files
		const formData = new FormData();

		// Add section metadata
		formData.append('sectionId', sectionId);
		formData.append('sectionName', sectionName);

		// Get all images from preview container
		let imageCount = 0;
		previewItems.forEach((item, index) => {
			// Get the image element inside the preview item
			const img = item.querySelector('.preview-img');
			if (img && img.src) {
				// Convert base64 data URL to blob
				fetch(img.src)
					.then(res => res.blob())
					.then(blob => {
						// Create a file from blob with a unique name
						const file = new File(
							[blob],
							`${sectionId}-image-${index}.${getImageTypeFromDataUrl(img.src)}`,
							{ type: blob.type }
						);

						// Append to form data with unique keys
						formData.append(`images`, file);
						imageCount++;

						// If this is the last image, send the request
						if (imageCount === previewItems.length) {
							sendToBackend(formData, sectionId, sectionName, btn, originalText);
						}
					});
			}
		});
	}
}

// Helper function to extract file extension from data URL
function getImageTypeFromDataUrl(dataUrl) {
	const match = dataUrl.match(/data:image\/(\w+);/);
	return match ? match[1] : 'jpeg'; // Default to jpeg if not found
}

// Function to send data to backend
function sendToBackend(formData, sectionId, sectionName, btn, originalText) {
	// Display uploading indicator
	const uploadingIndicator = document.createElement('div');
	uploadingIndicator.className = 'upload-progress';
	uploadingIndicator.textContent = 'Uploading to server...';

	const previewContainer = document.getElementById(`${sectionId}-preview-container`);
	previewContainer.insertAdjacentElement('afterend', uploadingIndicator);

	// Send to backend
	fetch('http://localhost:3000/upload-images', {
		method: 'POST',
		body: formData,
	})
		.then(response => {
			if (!response.ok) {
				throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
			}
			return response.json();
		})
		.then(data => {
			// Success handling
			uploadingIndicator.remove();
			alert(`Successfully uploaded ${data.uploadedCount} ${sectionName} images!`);

			// Reset the UI
			document.getElementById(`${sectionId}-preview-container`).innerHTML = '';
			document.getElementById(`${sectionId}-upload-actions`).style.display = 'none';
			document.getElementById(`${sectionId}-file-input`).value = '';

			// Reset the button
			btn.textContent = originalText;
			btn.disabled = false;
		})
		.catch(error => {
			// Error handling
			uploadingIndicator.textContent = 'Upload failed!';
			uploadingIndicator.style.color = 'red';

			console.error('Upload error:', error);
			alert(`Error uploading images: ${error.message}`);

			// Reset the button
			btn.textContent = originalText;
			btn.disabled = false;

			// Remove error message after a delay
			setTimeout(() => {
				uploadingIndicator.remove();
			}, 5000);
		});
}

// Initialize all sections when the document is ready
document.addEventListener('DOMContentLoaded', function () {
	// Set up the global modal functions
	setupModalFunctions();

	// Initialize each section
	const sections = ['main', 'home', 'about', 'products', 'team'];
	sections.forEach(section => {
		if (document.getElementById(`${section}-file-input`)) {
			handleImageUpload(section);
		}
	});
});

// Setup modal functions
function setupModalFunctions() {
	// Keep existing modal functions intact
	window.showImagePreview = function (imageName, title, location, dimensions, size) {
		const modal = document.getElementById('image-modal');
		const modalImage = document.getElementById('modal-image');

		// For demo purposes, we'll use placeholder images
		modalImage.src = `https://placehold.co/800x600`;

		// Set modal details
		document.getElementById('modal-name').textContent = title || imageName;
		document.getElementById('modal-location').textContent = location;
		document.getElementById('modal-dimensions').textContent = dimensions;
		document.getElementById('modal-size').textContent = size;

		// Show modal
		modal.style.display = 'block';
	};

	window.closeModal = function () {
		document.getElementById('image-modal').style.display = 'none';
	};

	window.openReplaceImage = function () {
		document.querySelector('.file-input').click();
		closeModal();
	};

	window.deleteImage = function () {
		if (confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
			alert('Image deleted successfully!');
			closeModal();
		}
	};
}

// Export functions to global scope for onclick usage in HTML
window.uploadHomeImages = function () {
	uploadSectionImages('home', 'Home Page');
};

window.uploadAboutImages = function () {
	uploadSectionImages('about', 'About Page');
};

window.uploadProductsImages = function () {
	uploadSectionImages('products', 'Products Page');
};

window.uploadTeamImages = function () {
	uploadSectionImages('team', 'Team Page');
};

window.uploadImages = function () {
	uploadSectionImages('main', 'Website');
};