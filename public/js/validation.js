// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  'use strict'

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024
  const COMPRESSION_THRESHOLD = 700 * 1024
  const MAX_UPLOAD_DIMENSION = 1280
  const COMPRESSED_IMAGE_QUALITY = 0.72
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  const ratingLabels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very good',
    5: 'Excellent'
  }

  const loadImageFromFile = file =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file)
      const image = new Image()

      image.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(image)
      }

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Unable to read the selected image.'))
      }

      image.src = objectUrl
    })

  const canvasToBlob = (canvas, type, quality) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Unable to process the selected image.'))
          return
        }

        resolve(blob)
      }, type, quality)
    })

  const compressImageFile = async file => {
    if (file.size <= COMPRESSION_THRESHOLD) {
      return file
    }

    const image = await loadImageFromFile(file)
    const scale = Math.min(
      1,
      MAX_UPLOAD_DIMENSION / Math.max(image.width, image.height)
    )

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))

    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const outputType = 'image/jpeg'
    const blob = await canvasToBlob(canvas, outputType, COMPRESSED_IMAGE_QUALITY)

    if (blob.size >= file.size) {
      return file
    }

    const extension = 'jpg'
    const sanitizedName = file.name.replace(/\.[^/.]+$/, '')

    return new File([blob], `${sanitizedName}-optimized.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    })
  }

  const geocodeListingLocation = async query => {
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
    const response = await fetch(geocodeUrl, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('We could not verify this location right now.')
    }

    const results = await response.json()

    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('We could not find this location on the map. Try a more specific city or area.')
    }

    const bestMatch = results[0]
    const latitude = Number(bestMatch.lat)
    const longitude = Number(bestMatch.lon)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('The map service returned an invalid location. Please try again.')
    }

    return {
      latitude,
      longitude,
      displayName: bestMatch.display_name || query,
    }
  }

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    const fileInput = form.querySelector('input[type="file"][name="image"]')
    const feedback = form.querySelector('.file-feedback')
    const locationFeedback = form.querySelector('[data-location-feedback]')
    const locationInput = form.querySelector('[data-location-input]')
    const countryInput = form.querySelector('[data-country-input]')
    const latitudeInput = form.querySelector('[data-location-latitude]')
    const longitudeInput = form.querySelector('[data-location-longitude]')
    const displayNameInput = form.querySelector('[data-location-display-name]')
    const submitButton = form.querySelector('.upload-submit-btn')
    const defaultLabel = submitButton?.querySelector('.default-label')
    const uploadingLabel = submitButton?.querySelector('.uploading-label')
    const ratingPicker = form.querySelector('[data-rating-picker]')
    const ratingInput = form.querySelector('.rating-value-input')
    const ratingCaption = form.querySelector('[data-rating-caption]')
    const ratingClearButton = form.querySelector('[data-rating-clear]')
    const ratingButtons = form.querySelectorAll('.rating-star-button')

    if (ratingPicker && ratingInput && ratingCaption) {
      const setRatingState = (value, previewValue = null) => {
        const activeValue = previewValue ?? Number(value || 0)

        ratingButtons.forEach(button => {
          const buttonValue = Number(button.dataset.ratingValue)
          button.classList.toggle('is-active', !previewValue && buttonValue <= Number(value || 0))
          button.classList.toggle('is-preview', Boolean(previewValue) && buttonValue <= previewValue)
        })

        ratingCaption.textContent = activeValue
          ? `${activeValue}/5 - ${ratingLabels[activeValue]}`
          : 'Select your rating'

        if (ratingClearButton) {
          ratingClearButton.classList.toggle('d-none', !value)
        }
      }

      setRatingState('')

      ratingButtons.forEach(button => {
        button.addEventListener('mouseenter', () => {
          setRatingState(ratingInput.value, Number(button.dataset.ratingValue))
        })

        button.addEventListener('click', () => {
          const clickedValue = button.dataset.ratingValue
          const nextValue = ratingInput.value === clickedValue ? '' : clickedValue

          ratingInput.value = nextValue
          ratingInput.setCustomValidity(nextValue ? '' : 'Please select at least 1 star.')
          setRatingState(nextValue)
        })
      })

      ratingPicker.addEventListener('mouseleave', () => {
        setRatingState(ratingInput.value)
      })

      ratingClearButton?.addEventListener('click', () => {
        ratingInput.value = ''
        ratingInput.setCustomValidity('Please select at least 1 star.')
        setRatingState('')
      })
    }

    if (fileInput && feedback) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0]

        feedback.textContent = ''
        feedback.classList.remove('text-danger', 'text-success')
        fileInput.setCustomValidity('')

        if (!file) {
          return
        }

        if (!allowedImageTypes.includes(file.type)) {
          fileInput.setCustomValidity('Please upload a JPG, PNG, WEBP, or AVIF image.')
          feedback.textContent = 'Please choose a JPG, PNG, WEBP, or AVIF image.'
          feedback.classList.add('text-danger')
          return
        }

        if (file.size > MAX_IMAGE_SIZE) {
          fileInput.setCustomValidity('Image must be 5MB or smaller.')
          feedback.textContent = 'Selected image is too large. Please keep it under 5MB.'
          feedback.classList.add('text-danger')
          return
        }

        const sizeInMb = (file.size / (1024 * 1024)).toFixed(2)
        feedback.textContent = `${file.name} selected (${sizeInMb} MB).`
        feedback.classList.add('text-success')
      })
    }

    const resetStoredLocation = () => {
      if (latitudeInput) latitudeInput.value = ''
      if (longitudeInput) longitudeInput.value = ''
      if (displayNameInput) displayNameInput.value = ''
      if (locationFeedback) {
        locationFeedback.classList.remove('text-danger', 'text-success')
        locationFeedback.textContent = ''
      }
    }

    locationInput?.addEventListener('input', resetStoredLocation)
    countryInput?.addEventListener('input', resetStoredLocation)

    form.addEventListener('submit', async event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
        if (ratingInput && !ratingInput.value) {
          ratingInput.setCustomValidity('Please select at least 1 star.')
        }
      } else if (submitButton && !form.dataset.isSubmitting) {
        event.preventDefault()
        form.dataset.isSubmitting = 'true'
        submitButton.disabled = true
        defaultLabel?.classList.add('d-none')
        uploadingLabel?.classList.remove('d-none')

        try {
          const hasLocationFields =
            locationInput &&
            countryInput &&
            latitudeInput &&
            longitudeInput &&
            displayNameInput

          if (hasLocationFields) {
            const locationLabel = `${locationInput.value.trim()}, ${countryInput.value.trim()}`

            if (!latitudeInput.value || !longitudeInput.value) {
              if (locationFeedback) {
                locationFeedback.textContent = 'Matching this listing to the map...'
                locationFeedback.classList.remove('text-danger', 'text-success')
              }

              const matchedLocation = await geocodeListingLocation(locationLabel)
              latitudeInput.value = matchedLocation.latitude
              longitudeInput.value = matchedLocation.longitude
              displayNameInput.value = matchedLocation.displayName

              if (locationFeedback) {
                locationFeedback.textContent = `Map match saved: ${matchedLocation.displayName}`
                locationFeedback.classList.add('text-success')
              }
            }
          }

          if (fileInput?.files?.[0]) {
            const originalFile = fileInput.files[0]
            feedback.textContent = 'Optimizing image before upload...'
            feedback.classList.remove('text-danger', 'text-success')

            const optimizedFile = await compressImageFile(originalFile)

            if (optimizedFile !== originalFile) {
              const dataTransfer = new DataTransfer()
              dataTransfer.items.add(optimizedFile)
              fileInput.files = dataTransfer.files

              const savedPercent = Math.max(
                1,
                Math.round((1 - optimizedFile.size / originalFile.size) * 100)
              )
              const sizeInMb = (optimizedFile.size / (1024 * 1024)).toFixed(2)
              feedback.textContent = `Image optimized for faster upload (${savedPercent}% smaller, ${sizeInMb} MB).`
              feedback.classList.add('text-success')
            } else {
              feedback.textContent = 'Uploading image...'
            }
          }

          form.submit()
        } catch (error) {
          form.dataset.isSubmitting = ''
          submitButton.disabled = false
          defaultLabel?.classList.remove('d-none')
          uploadingLabel?.classList.add('d-none')
          if (fileInput && feedback && fileInput.files?.[0]) {
            fileInput.setCustomValidity('Unable to process the selected image.')
            feedback.textContent = error.message
            feedback.classList.remove('text-success')
            feedback.classList.add('text-danger')
          } else if (locationFeedback) {
            locationFeedback.textContent = error.message
            locationFeedback.classList.remove('text-success')
            locationFeedback.classList.add('text-danger')
          }
          form.classList.add('was-validated')
        }
      }

      form.classList.add('was-validated')
    }, false)
  })
})()
