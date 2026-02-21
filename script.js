// Employee Onboarding Form - Complete JavaScript File with new features
class OnboardingForm {
    constructor() {
        this.currentSection = 1;
        this.educationCount = 1;
        this.experienceCount = 0;
        this.testingMode = false;
        this.uploadedFiles = {
            aadhar: [],
            pan: null,
            education: {},
            experience: {}
        };
        this.statesData = {};
        this.locationData = {};
        this.educationMasterRows = [];
        this.educationLevelOptions = [];
        this.degreeNamesByType = {};
        this.specializationsByTypeAndDegree = {};
        this.universities = [];
        this.employeeIdCheckInFlight = false;

        this.init();
    }

    init() {
        console.log('Initializing Onboarding Form...');
        this.bindEvents();
        this.configureDobAgeRule();
        this.initializeDatePickers();
        this.disableValidationForTesting();
        this.initializeStateDistricts();
        this.loadEducationData();
        this.loadUniversityData();
        this.initializeBankNameField();
        this.setupInputSanitizers();
        this.applyMandatoryIndicators();
        this.addRealTimeValidation();
        this.addProgressBarClickHandlers();
        this.setupExperienceValidationRules();
        this.updateProgress();
        this.updateHighestQualificationField();
        console.log('Onboarding Form initialized successfully');
    }

    disableValidationForTesting() {
        if (!this.testingMode) return;

        const form = document.getElementById('onboardingForm');
        if (form) {
            form.setAttribute('novalidate', 'novalidate');
        }

        document.querySelectorAll('[required]').forEach((el) => {
            el.removeAttribute('required');
            el.classList.remove('is-invalid');
        });

        document.querySelectorAll('.required').forEach((el) => {
            el.classList.remove('required');
        });
    }

    // Add click handlers for progress bar steps
    addProgressBarClickHandlers() {
        const progressSteps = document.querySelectorAll('.step');
        progressSteps.forEach((step, index) => {
            step.style.cursor = 'pointer';
            step.addEventListener('click', () => {
                if (index + 1 < this.currentSection) {
                    // Navigate to previous section if it's before current
                    this.navigateToSection(index + 1);
                }
            });
        });
    }

    // Navigate to specific section
    navigateToSection(sectionNumber) {
        if (sectionNumber < 1 || sectionNumber > 6) return;

        // Validate all previous sections before moving
        let canNavigate = true;
        for (let i = 1; i < sectionNumber; i++) {
            if (!this.validateSection(i, true)) { // true = silent validation
                canNavigate = false;
                this.showNotification(`Please complete section ${i} first`, 'warning');
                break;
            }
        }

        if (canNavigate) {
            // Hide current section
            const currentSectionEl = document.getElementById(`section${this.currentSection}`);
            if (currentSectionEl) {
                currentSectionEl.style.display = 'none';
            }

            // Show target section
            const targetSectionEl = document.getElementById(`section${sectionNumber}`);
            if (targetSectionEl) {
                targetSectionEl.style.display = 'block';
                this.currentSection = sectionNumber;
                this.updateProgress();

                // Scroll to top of section
                window.scrollTo({
                    top: targetSectionEl.offsetTop - 50,
                    behavior: 'smooth'
                });
            }
        }
    }

    setupExperienceValidationRules() {
        if (this.testingMode) return;

        // Add event listeners for experience letter upload
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('experience-letter')) {
                this.validateExperienceDocuments(e.target);
            }
        });
    }

    validateExperienceDocuments(experienceLetterInput) {
        if (this.testingMode) return;

        const index = experienceLetterInput.dataset.index ||
            experienceLetterInput.closest('.experience-entry')?.querySelector('.experience-letter')?.dataset.index;

        if (index === undefined || index === null || index === '') return;

        const entry = experienceLetterInput.closest('.experience-entry') ||
            document.querySelector(`.experience-entry [data-index="${index}"]`)?.closest('.experience-entry');
        if (!entry) return;

        const experienceLetter = entry.querySelector('.experience-letter');
        const appointmentLetter = entry.querySelector('.appointment-letter');
        const relievingLetter = entry.querySelector('.relieving-letter');

        const hasExperienceLetter = !!(this.uploadedFiles.experience[index]?.experience ||
            (experienceLetter && experienceLetter.files.length > 0));

        if (hasExperienceLetter) {
            // If experience letter is provided, appointment and relieving letters are optional
            if (appointmentLetter) {
                appointmentLetter.removeAttribute('required');
                appointmentLetter.classList.remove('is-invalid');
                this.removeFieldError(appointmentLetter);
                appointmentLetter.closest('.floating-input')?.querySelector('label')?.classList.remove('required');
            }
            if (relievingLetter) {
                relievingLetter.removeAttribute('required');
                relievingLetter.classList.remove('is-invalid');
                this.removeFieldError(relievingLetter);
                relievingLetter.closest('.floating-input')?.querySelector('label')?.classList.remove('required');
            }
        } else {
            // If no experience letter, appointment and relieving letters are required
            if (appointmentLetter) {
                appointmentLetter.setAttribute('required', 'required');
                appointmentLetter.closest('.floating-input')?.querySelector('label')?.classList.add('required');
            }
            if (relievingLetter) {
                relievingLetter.setAttribute('required', 'required');
                relievingLetter.closest('.floating-input')?.querySelector('label')?.classList.add('required');
            }
        }
    }

    bindEvents() {
        console.log('Binding events...');

        // File upload handlers
        const aadharUploadBox = document.getElementById('aadharUploadBox');
        const aadharFile = document.getElementById('aadharFile');
        const panUploadBox = document.getElementById('panUploadBox');
        const panFile = document.getElementById('panFile');

        if (aadharUploadBox && aadharFile) {
            aadharUploadBox.addEventListener('click', () => aadharFile.click());
            aadharFile.addEventListener('change', (e) => this.handleAadharUpload(e));
        }

        if (panUploadBox && panFile) {
            panUploadBox.addEventListener('click', () => panFile.click());
            panFile.addEventListener('change', (e) => this.handlePanUpload(e));
        }

        // Same address checkbox
        const sameAsCurrent = document.getElementById('sameAsCurrent');
        if (sameAsCurrent) {
            sameAsCurrent.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const currentAddress = document.getElementById('currentAddress');
                    const permanentAddress = document.getElementById('permanentAddress');
                    if (currentAddress && permanentAddress) {
                        permanentAddress.value = currentAddress.value;
                    }
                }
            });
        }

        // Country and state dependent dropdowns
        const countrySelect = document.getElementById('country');
        if (countrySelect) {
            countrySelect.addEventListener('change', (e) => this.loadStates(e.target.value));
        }

        const stateSelect = document.getElementById('state');
        if (stateSelect) {
            stateSelect.addEventListener('change', (e) => this.loadDistricts(e.target.value));
        }

        const passportNumberInput = document.getElementById('passportNumber');
        if (passportNumberInput) {
            passportNumberInput.addEventListener('input', () => this.syncPassportValidation());
            passportNumberInput.addEventListener('change', () => this.syncPassportValidation());
        }

        const bankNameSelect = document.getElementById('bankName');
        if (bankNameSelect) {
            bankNameSelect.addEventListener('change', () => this.toggleBankOtherField());
        }

        const employeeIdInput = document.getElementById('employeeId');
        if (employeeIdInput) {
            employeeIdInput.addEventListener('blur', () => {
                this.validateEmployeeIdAvailability({ showNotification: false, markField: true });
            });
            employeeIdInput.addEventListener('input', () => {
                employeeIdInput.classList.remove('is-invalid');
                this.removeFieldError(employeeIdInput);
            });
        }

        // Work experience radio - set "No" as default
        const hasExperienceNo = document.getElementById('hasExperienceNo');
        if (hasExperienceNo) {
            hasExperienceNo.checked = true;
        }

        document.querySelectorAll('input[name="hasExperience"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleExperienceSection(e.target.value === 'Yes');
                // Clear validation for experience fields when No is selected
                if (e.target.value === 'No') {
                    this.clearExperienceValidation();
                }
            });
        });

        // Conditional fields
        document.querySelectorAll('input[name="previousInterview"], input[name="criminalCase"], input[name="disability"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.toggleConditionalFields(e.target.name, e.target.value));
        });

        // Form submission
        const onboardingForm = document.getElementById('onboardingForm');
        if (onboardingForm) {
            onboardingForm.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            });
            onboardingForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Education autocomplete for board/university
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('board-university')) {
                this.showUniversitySuggestions(e.target);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('education-level')) {
                this.handleEducationLevelChange(e.target);
            }
            if (e.target.classList.contains('qualification')) {
                this.handleQualificationChange(e.target);
                this.updateHighestQualificationField();
            }
            if (e.target.classList.contains('year-of-passing')) {
                this.updateHighestQualificationField();
            }
        });

        // Drag and drop for upload boxes
        document.querySelectorAll('.upload-box').forEach(box => {
            box.addEventListener('dragover', this.handleDragOver);
            box.addEventListener('dragleave', this.handleDragLeave);
            box.addEventListener('drop', (e) => this.handleDrop(e));
        });

        // Bind click/change handlers for any existing education certificate inputs
        document.querySelectorAll('.education-entry').forEach(entry => {
            const uploadBox = entry.querySelector('.upload-box');
            const fileInput = entry.querySelector('.certificate-file');
            const idx = uploadBox?.dataset.index ?? fileInput?.dataset.index ?? '0';
            if (uploadBox && fileInput) {
                uploadBox.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', (e) => this.handleCertificateUpload(e, Number(idx)));
            }
        });

        // Bind click/change handlers for any existing experience letter inputs
        document.querySelectorAll('.experience-entry').forEach(entry => {
            ['appointment', 'experience', 'relieving'].forEach(type => {
                const box = entry.querySelector(`[data-type="${type}"]`);
                const input = entry.querySelector(`.${type}-letter`);
                const idx = box?.dataset.index ?? input?.dataset.index ?? '0';
                if (box && input) {
                    box.addEventListener('click', () => input.click());
                    input.addEventListener('change', (e) => this.handleExperienceUpload(e.target.files[0], Number(idx), type));
                }
            });
        });

        // Initialize floating labels
        this.initializeFloatingLabels();
        this.syncPassportValidation();

        console.log('All events bound successfully');
    }


    addRealTimeValidation() {
        console.log('Adding real-time validation...');

        // Add input event listeners for real-time feedback
        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('blur', () => {
                const value = input.value.trim();

                if (input.hasAttribute('required') && !value) {
                    input.classList.add('is-invalid');
                    this.showFieldError(input, 'This field is required');
                    return;
                }

                if (!value) {
                    input.classList.remove('is-invalid');
                    this.removeFieldError(input);
                    return;
                }

                input.classList.remove('is-invalid');
                this.removeFieldError(input);

                // Validate specific field types even for non-required fields when value is present
                this.validateFieldType(input, value);
            });

            // Clear validation on input
            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid')) {
                    input.classList.remove('is-invalid');
                    this.removeFieldError(input);
                }
            });
        });

        // Add event listeners for radio buttons
        document.querySelectorAll('input[type="radio"][required]').forEach(radio => {
            radio.addEventListener('change', () => {
                const radioName = radio.name;
                const radioGroup = document.querySelectorAll(`input[name="${radioName}"]`);
                const errorDiv = document.getElementById(`${radioName}Error`) ||
                    radioGroup[0].closest('.form-check')?.nextElementSibling;

                if (document.querySelector(`input[name="${radioName}"]:checked`)) {
                    radioGroup.forEach(r => r.classList.remove('is-invalid'));
                    if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
                        errorDiv.style.display = 'none';
                    }
                }
            });
        });

        // Validate experience date range in real time
        document.addEventListener('change', (e) => {
            if (e.target.classList?.contains('from-date') || e.target.classList?.contains('to-date')) {
                const entry = e.target.closest('.experience-entry');
                if (entry) {
                    this.validateExperienceDateRange(entry);
                    this.validateExperienceOverlaps(true);
                }
            }
        });

        console.log('Real-time validation added');
    }

    validateExperienceDateRange(entry, silent = false) {
        const fromDateInput = entry.querySelector('.from-date');
        const toDateInput = entry.querySelector('.to-date');

        if (!fromDateInput || !toDateInput) return true;

        const fromValue = fromDateInput.value?.trim();
        const toValue = toDateInput.value?.trim();

        // Skip comparison until both dates are provided
        if (!fromValue || !toValue) {
            fromDateInput.classList.remove('is-invalid');
            this.removeFieldError(fromDateInput);
            toDateInput.classList.remove('is-invalid');
            this.removeFieldError(toDateInput);
            return true;
        }

        const fromDate = new Date(fromValue);
        const toDate = new Date(toValue);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
            return true;
        }

        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(0, 0, 0, 0);

        if (toDate <= fromDate) {
            if (!silent) {
                toDateInput.classList.add('is-invalid');
                this.showFieldError(toDateInput, 'To Date must be later than From Date');
            }
            return false;
        }

        if (fromDate >= today) {
            if (!silent) {
                fromDateInput.classList.add('is-invalid');
                this.showFieldError(fromDateInput, 'From Date must be earlier than today');
            }
            return false;
        }

        if (toDate >= today) {
            if (!silent) {
                toDateInput.classList.add('is-invalid');
                this.showFieldError(toDateInput, 'To Date must be earlier than today');
            }
            return false;
        }

        const dateOfJoiningValue = document.getElementById('dateOfJoining')?.value?.trim();
        if (dateOfJoiningValue) {
            const dateOfJoining = new Date(dateOfJoiningValue);
            if (!Number.isNaN(dateOfJoining.getTime())) {
                dateOfJoining.setHours(0, 0, 0, 0);
                if (toDate > dateOfJoining) {
                    if (!silent) {
                        toDateInput.classList.add('is-invalid');
                        this.showFieldError(toDateInput, 'To Date must be on or before Date of Joining');
                    }
                    return false;
                }
            }
        }

        fromDateInput.classList.remove('is-invalid');
        this.removeFieldError(fromDateInput);
        toDateInput.classList.remove('is-invalid');
        this.removeFieldError(toDateInput);
        return true;
    }

    validateExperienceOverlaps(silent = false) {
        const entries = Array.from(document.querySelectorAll('.experience-entry'));
        const ranges = [];

        entries.forEach((entry) => {
            const fromDateInput = entry.querySelector('.from-date');
            const toDateInput = entry.querySelector('.to-date');
            const fromValue = fromDateInput?.value?.trim();
            const toValue = toDateInput?.value?.trim();
            if (!fromDateInput || !toDateInput || !fromValue || !toValue) return;

            const fromDate = new Date(fromValue);
            const toDate = new Date(toValue);
            if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return;

            fromDate.setHours(0, 0, 0, 0);
            toDate.setHours(0, 0, 0, 0);
            ranges.push({ fromDateInput, toDateInput, fromDate, toDate });
        });

        let hasOverlap = false;
        for (let i = 0; i < ranges.length; i++) {
            for (let j = i + 1; j < ranges.length; j++) {
                const a = ranges[i];
                const b = ranges[j];
                const isOverlap = a.fromDate <= b.toDate && b.fromDate <= a.toDate;
                if (!isOverlap) continue;

                hasOverlap = true;
                if (!silent) {
                    [a.fromDateInput, a.toDateInput, b.fromDateInput, b.toDateInput].forEach((input) => {
                        input.classList.add('is-invalid');
                    });
                    this.showFieldError(a.toDateInput, 'Experience date range overlaps with another entry');
                    this.showFieldError(b.toDateInput, 'Experience date range overlaps with another entry');
                }
            }
        }

        return !hasOverlap;
    }

    configureDobAgeRule() {
        const dobInput = document.getElementById('dateOfBirth');
        const dojInput = document.getElementById('dateOfJoining');
        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        if (dojInput) {
            dojInput.max = todayIso;
        }
        if (!dobInput) return;

        const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        const year = maxDob.getFullYear();
        const month = String(maxDob.getMonth() + 1).padStart(2, '0');
        const day = String(maxDob.getDate()).padStart(2, '0');

        dobInput.max = `${year}-${month}-${day}`;
    }

    initializeDatePickers(root = document) {
        if (typeof flatpickr !== 'function') return;

        const dateInputs = root.querySelectorAll('#dateOfBirth, #dateOfJoining, #passportValidUpto, .year-of-passing, .from-date, .to-date');
        dateInputs.forEach((input) => {
            if (input._flatpickr) return;

            input.classList.add('date-input');

            const config = {
                dateFormat: 'Y-m-d',
                disableMobile: true,
                allowInput: false,
                appendTo: document.body,
                position: 'auto left',
                onReady: (selectedDates, dateStr, instance) => {
                    this.scheduleCalendarClamp(instance);
                },
                onOpen: (selectedDates, dateStr, instance) => {
                    this.scheduleCalendarClamp(instance);
                },
                onMonthChange: (selectedDates, dateStr, instance) => {
                    this.scheduleCalendarClamp(instance);
                },
                onYearChange: (selectedDates, dateStr, instance) => {
                    this.scheduleCalendarClamp(instance);
                },
                onChange: () => {
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };

            if (input.id === 'dateOfBirth' && input.max) {
                config.maxDate = input.max;
            }
            if (input.id === 'dateOfJoining') {
                config.maxDate = 'today';
            }

            flatpickr(input, config);
        });
    }

    scheduleCalendarClamp(instance) {
        requestAnimationFrame(() => this.keepCalendarInsideForm(instance));
        setTimeout(() => this.keepCalendarInsideForm(instance), 0);
    }

    keepCalendarInsideForm(instance) {
        const formContainer = document.querySelector('.main-content');
        const calendar = instance?.calendarContainer;
        if (!formContainer || !calendar) return;

        const formRect = formContainer.getBoundingClientRect();
        const calRect = calendar.getBoundingClientRect();

        let left = parseFloat(calendar.style.left || '0');
        if (Number.isNaN(left)) return;

        const rightOverflow = calRect.right - formRect.right;
        if (rightOverflow > 0) {
            left -= (rightOverflow + 8);
        }

        const newCalRect = calendar.getBoundingClientRect();
        const leftOverflow = formRect.left - newCalRect.left;
        if (leftOverflow > 0) {
            left += (leftOverflow + 8);
        }

        calendar.style.left = `${left}px`;
    }

    setupInputSanitizers() {
        const digitsOnlyFieldIds = [
            'contactNumber',
            'emergencyContactNumber',
            'aadharNumber',
            'uanNumber',
            'pincode',
            'accountNumber'
        ];

        digitsOnlyFieldIds.forEach((fieldId) => {
            const input = document.getElementById(fieldId);
            if (!input) return;
            input.addEventListener('input', () => {
                input.value = input.value.replace(/\D/g, '');
            });
        });

        const panInput = document.getElementById('panNumber');
        if (panInput) {
            panInput.addEventListener('input', () => {
                panInput.value = panInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
            });
        }

        const ifscInput = document.getElementById('ifscCode');
        if (ifscInput) {
            ifscInput.addEventListener('input', () => {
                ifscInput.value = ifscInput.value.toUpperCase();
            });
        }

        const nameFieldIds = ['fullName', 'fatherName', 'emergencyContactName'];
        nameFieldIds.forEach((fieldId) => {
            const input = document.getElementById(fieldId);
            if (!input) return;
            input.addEventListener('input', () => {
                input.value = input.value.replace(/[^A-Za-z.\s'-]/g, '');
            });
        });

        const cityInput = document.getElementById('city');
        if (cityInput) {
            cityInput.addEventListener('input', () => {
                cityInput.value = cityInput.value.replace(/[^A-Za-z.\s'-]/g, '');
            });
        }

        const bankHolderNameInput = document.getElementById('bankHolderName');
        if (bankHolderNameInput) {
            bankHolderNameInput.addEventListener('input', () => {
                bankHolderNameInput.value = bankHolderNameInput.value
                    .replace(/[^A-Za-z.\s'-]/g, '')
                    .toUpperCase();
            });
        }

        // Dynamic experience contact fields
        document.addEventListener('input', (e) => {
            if (e.target.classList?.contains('company-contact')) {
                e.target.value = e.target.value.replace(/\D/g, '');
            }
            if (e.target.classList?.contains('cgpa')) {
                e.target.value = e.target.value.replace(/[^0-9.]/g, '');
                const parts = e.target.value.split('.');
                if (parts.length > 2) {
                    e.target.value = `${parts[0]}.${parts.slice(1).join('')}`;
                }
            }
        });
    }

    applyMandatoryIndicators(root = document) {
        const fields = root.querySelectorAll('input, select, textarea');
        fields.forEach((field) => {
            const wrapper = field.closest('.floating-input');
            if (!wrapper) return;

            let label = null;
            if (field.id) {
                label = wrapper.querySelector(`label[for="${field.id}"]`);
            }
            if (!label) {
                label = wrapper.querySelector('label');
            }
            if (label) {
                const isMandatory = field.required || field.classList.contains('mandatory');
                label.classList.toggle('mandatory', isMandatory);
            }
        });
    }

    showFieldError(input, message) {
        // Remove existing error
        this.removeFieldError(input);

        // Add new error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        errorDiv.style.fontSize = '14px';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.marginTop = '5px';

        // Insert after input
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
    }

    removeFieldError(input) {
        const existingError = input.nextElementSibling;
        if (existingError && existingError.classList.contains('invalid-feedback')) {
            existingError.remove();
        }
    }

    validateFieldType(input, value) {
        let isValid = true;
        let errorMessage = '';

        switch (input.type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;

            case 'tel':
                if (input.id === 'contactNumber' && value) {
                    const phoneRegex = /^[0-9]{10}$/;
                    if (!phoneRegex.test(value.replace(/\D/g, ''))) {
                        isValid = false;
                        errorMessage = 'Please enter a valid 10-digit mobile number';
                    }
                }
                if ((input.id === 'emergencyContactNumber' || input.classList.contains('company-contact')) && value) {
                    const emergencyPhoneRegex = /^[0-9]{10}$/;
                    if (!emergencyPhoneRegex.test(value.replace(/\D/g, ''))) {
                        isValid = false;
                        errorMessage = 'Please enter a valid 10-digit contact number';
                    }
                }
                break;

            case 'text':
                if (['fullName', 'fatherName', 'bankHolderName', 'emergencyContactName'].includes(input.id) && value) {
                    const nameRegex = /^[A-Za-z.\s'-]+$/;
                    if (!nameRegex.test(value) || /\d/.test(value)) {
                        isValid = false;
                        errorMessage = 'Only letters are allowed in name fields';
                    }
                }
                if (input.id === 'aadharNumber' && value) {
                    const aadharRegex = /^[0-9]{12}$/;
                    if (!aadharRegex.test(value.replace(/\s/g, ''))) {
                        isValid = false;
                        errorMessage = 'Please enter a valid 12-digit Aadhar number';
                    }
                }
                if (input.id === 'uanNumber' && value) {
                    const uanRegex = /^[0-9]{12}$/;
                    if (!uanRegex.test(value.replace(/\s/g, ''))) {
                        isValid = false;
                        errorMessage = 'Please enter a valid 12-digit UAN number';
                    }
                }
                if (input.id === 'panNumber' && value) {
                    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                    if (!panRegex.test(value.toUpperCase())) {
                        isValid = false;
                        errorMessage = 'Please enter a valid PAN number';
                    }
                }
                if (input.id === 'pincode' && value) {
                    const pincodeRegex = /^[0-9]{6}$/;
                    if (!pincodeRegex.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid 6-digit pincode';
                    }
                }
                break;

        }

        if (input.id === 'dateOfBirth' && value) {
            const dob = new Date(value);
            const today = new Date();
            const minAgeDate = new Date();
            minAgeDate.setFullYear(today.getFullYear() - 18);

            if (!Number.isNaN(dob.getTime()) && dob > minAgeDate) {
                isValid = false;
                errorMessage = 'You must be at least 18 years old';
            }
        }

        if (input.id === 'dateOfJoining' && value) {
            const dateOfJoining = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!Number.isNaN(dateOfJoining.getTime())) {
                dateOfJoining.setHours(0, 0, 0, 0);
                if (dateOfJoining > today) {
                    isValid = false;
                    errorMessage = 'Date of Joining cannot be in the future';
                }
            }
        }

        if (input.classList?.contains('year-of-passing') && value) {
            const yearOfPassing = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!Number.isNaN(yearOfPassing.getTime())) {
                yearOfPassing.setHours(0, 0, 0, 0);
                if (yearOfPassing > today) {
                    isValid = false;
                    errorMessage = 'Year of Passing cannot be in the future';
                }
            }
        }

        if (input.id === 'city' && value) {
            const cityRegex = /^[A-Za-z.\s'-]+$/;
            if (!cityRegex.test(value)) {
                isValid = false;
                errorMessage = 'City must contain letters only';
            }
        }

        if (input.classList?.contains('cgpa') && value) {
            const cgpaRegex = /^\d+(\.\d+)?$/;
            const cgpaValue = Number(value);
            if (!cgpaRegex.test(value) || Number.isNaN(cgpaValue)) {
                isValid = false;
                errorMessage = 'CGPA / % must be a valid number';
            } else if (cgpaValue > 100 || cgpaValue < 0) {
                isValid = false;
                errorMessage = 'CGPA / % cannot be greater than 100';
            }
        }

        if (!isValid && errorMessage) {
            input.classList.add('is-invalid');
            this.showFieldError(input, errorMessage);
        }

        return isValid;
    }

    initializeFloatingLabels() {
        // Check all inputs on page load
        document.querySelectorAll('.floating-input input, .floating-input select, .floating-input textarea').forEach(input => {
            this.updateLabelPosition(input);

            // Add event listeners
            input.addEventListener('focus', () => this.updateLabelPosition(input));
            input.addEventListener('blur', () => this.updateLabelPosition(input));
            input.addEventListener('input', () => this.updateLabelPosition(input));
            input.addEventListener('change', () => this.updateLabelPosition(input));
        });
    }

    updateLabelPosition(input) {
        const label = input.previousElementSibling;
        if (label && label.tagName === 'LABEL') {
            if (input.value || input === document.activeElement) {
                label.style.top = '-12px';
                label.style.transform = 'scale(0.95)';
                label.style.color = '#1565D8';
            } else {
                label.style.top = '-12px';
                label.style.transform = 'scale(1)';
                label.style.color = '#001C73';
            }
        }
    }

    initializeBankNameField() {
        const bankNameSelect = document.getElementById('bankName');
        if (!bankNameSelect) return;

        const bankNames = [
            'AU Small Finance Bank',
            'Airtel Payments Bank',
            'Axis Bank',
            'Bandhan Bank',
            'Bank of America',
            'Bank of Bahrain and Kuwait',
            'Bank of Baroda',
            'Bank of Ceylon',
            'Bank of India',
            'Bank of Maharashtra',
            'Barclays Bank',
            'BNP Paribas',
            'Canara Bank',
            'Capital Small Finance Bank',
            'Central Bank of India',
            'Citibank',
            'City Union Bank',
            'CSB Bank',
            'DBS Bank India',
            'DCB Bank',
            'Deutsche Bank',
            'Dhanlaxmi Bank',
            'DOHA Bank',
            'Emirates NBD Bank',
            'ESAF Small Finance Bank',
            'Export-Import Bank of India',
            'Federal Bank',
            'Fincare Small Finance Bank',
            'First Abu Dhabi Bank',
            'HDFC Bank',
            'HSBC',
            'ICICI Bank',
            'IDBI Bank',
            'IDFC FIRST Bank',
            'India Post Payments Bank',
            'Indian Bank',
            'Indian Overseas Bank',
            'IndusInd Bank',
            'Jammu & Kashmir Bank',
            'Jana Small Finance Bank',
            'Janata Sahakari Bank',
            'Jio Payments Bank',
            'Karnataka Bank',
            'Karur Vysya Bank',
            'Kerala Gramin Bank',
            'Kotak Mahindra Bank',
            'Maharashtra Gramin Bank',
            'Mizuho Bank',
            'MUFG Bank',
            'National Bank for Agriculture and Rural Development',
            'Nainital Bank',
            'North East Small Finance Bank',
            'NSDL Payments Bank',
            'Paytm Payments Bank',
            'Punjab & Sind Bank',
            'Punjab Gramin Bank',
            'Punjab National Bank',
            'RBL Bank',
            'Saraswat Co-operative Bank',
            'Shinhan Bank',
            'Shivalik Small Finance Bank',
            'South Indian Bank',
            'Standard Chartered Bank',
            'State Bank of India',
            'Suryoday Small Finance Bank',
            'Tamilnad Mercantile Bank',
            'Tamil Nadu State Apex Co-operative Bank',
            'The Cosmos Co-operative Bank',
            'The Kalupur Commercial Co-operative Bank',
            'UCO Bank',
            'Ujjivan Small Finance Bank',
            'Union Bank of India',
            'Utkarsh Small Finance Bank',
            'Yes Bank'
        ];

        const uniqueBankNames = Array.from(new Set(bankNames)).sort((a, b) => a.localeCompare(b));
        uniqueBankNames.forEach((bankName) => {
            const option = document.createElement('option');
            option.value = bankName;
            option.textContent = bankName;
            bankNameSelect.appendChild(option);
        });

        const otherOption = document.createElement('option');
        otherOption.value = 'Other';
        otherOption.textContent = 'Other';
        bankNameSelect.appendChild(otherOption);
    }

    toggleBankOtherField() {
        const bankNameSelect = document.getElementById('bankName');
        const bankNameOtherWrapper = document.getElementById('bankNameOtherWrapper');
        const bankNameOtherInput = document.getElementById('bankNameOther');
        if (!bankNameSelect || !bankNameOtherWrapper || !bankNameOtherInput) return;

        const isOtherSelected = bankNameSelect.value === 'Other';
        bankNameOtherWrapper.style.display = isOtherSelected ? 'block' : 'none';
        bankNameOtherInput.required = isOtherSelected;

        if (!isOtherSelected) {
            bankNameOtherInput.value = '';
        }

        this.applyMandatoryIndicators(document);
    }

    syncPassportValidation() {
        const passportNumberInput = document.getElementById('passportNumber');
        const passportValidUptoInput = document.getElementById('passportValidUpto');
        if (!passportNumberInput || !passportValidUptoInput) return;

        const shouldRequireValidity = passportNumberInput.value.trim() !== '';
        passportValidUptoInput.required = shouldRequireValidity;
        if (!shouldRequireValidity) {
            passportValidUptoInput.classList.remove('is-invalid');
            this.removeFieldError(passportValidUptoInput);
        }

        this.applyMandatoryIndicators(document);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');

        const files = e.dataTransfer.files;
        const box = e.currentTarget;

        if (box.id === 'aadharUploadBox') {
            this.handleAadharUpload({ target: { files } });
        } else if (box.id === 'panUploadBox') {
            this.handlePanUpload({ target: { files } });
        } else if (box.dataset.type) {
            this.handleExperienceUpload(files[0], box.dataset.index, box.dataset.type);
        }
    }

    async handleAadharUpload(e) {
        const files = Array.from(e.target.files);
        const maxSize = 2 * 1024 * 1024; // 2MB

        for (const file of files) {
            if (file.size > maxSize) {
                this.showNotification('File size must be less than 2MB', 'error');
                continue;
            }

            this.uploadedFiles.aadhar.push(file);
        }

        this.updateAadharFilesList();
    }

    handlePanUpload(e) {
        const file = e.target.files[0];
        if (file && file.size <= 2 * 1024 * 1024) {
            this.uploadedFiles.pan = file;
            const box = document.getElementById('panUploadBox');
            box.innerHTML = `
                    <i class="fa-solid fa-file-circle-check upload-icon" style="color:green;"></i>
                    <span class="upload-text" style="color:green;">${file.name}</span>
                `;
        } else {
            this.showNotification('PAN file must be less than 2MB', 'error');
        }
    }

    updateAadharFilesList() {
        const container = document.getElementById('aadharFilesList');
        if (container) {
            container.innerHTML = this.uploadedFiles.aadhar.map((file, index) => `
                    <div class="file-pill">
                        <i class="fas fa-file-pdf"></i>
                        ${file.name}
                        <i class="fas fa-times" onclick="onboardingForm.removeAadharFile(${index})"></i>
                    </div>
                `).join('');
        }
    }

    removeAadharFile(index) {
        this.uploadedFiles.aadhar.splice(index, 1);
        this.updateAadharFilesList();
    }


    initializeStateDistricts() {
        this.statesData = {

            'Andhra Pradesh': [
                'Anakapalli', 'Anantapur', 'Annamayya', 'Bapatla', 'Chittoor',
                'East Godavari', 'Eluru', 'Guntur', 'Kakinada', 'Konaseema',
                'Krishna', 'Kurnool', 'Nandyal', 'Nellore', 'Palnadu',
                'Parvathipuram Manyam', 'Prakasam', 'Srikakulam',
                'Sri Sathya Sai', 'Tirupati', 'Visakhapatnam',
                'Vizianagaram', 'West Godavari', 'YSR Kadapa'
            ],

            'Arunachal Pradesh': [
                'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng',
                'East Siang', 'Itanagar Capital Complex', 'Kamle',
                'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit',
                'Longding', 'Lower Dibang Valley', 'Lower Siang',
                'Lower Subansiri', 'Namsai', 'Pakke Kessang',
                'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang',
                'Tirap', 'Upper Siang', 'Upper Subansiri',
                'West Kameng', 'West Siang'
            ],

            'Assam': [
                'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar',
                'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri',
                'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat',
                'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metro',
                'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur',
                'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar',
                'Sonitpur', 'South Salmara', 'Tinsukia', 'Udalguri',
                'West Karbi Anglong'
            ],

            'Bihar': [
                'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai',
                'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran',
                'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
                'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai',
                'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur',
                'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas',
                'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura',
                'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali',
                'West Champaran'
            ],

            'Chhattisgarh': [
                'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara',
                'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg',
                'Gariaband', 'Gaurela Pendra Marwahi', 'Janjgir Champa',
                'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba',
                'Koriya', 'Mahasamund', 'Mungeli', 'Narayanpur',
                'Raigarh', 'Raipur', 'Rajnandgaon', 'Sukma',
                'Surajpur', 'Surguja'
            ],

            'Goa': ['North Goa', 'South Goa'],

            'Gujarat': [
                'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha',
                'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod',
                'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath',
                'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar',
                'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
                'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat',
                'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'
            ],

            'Haryana': [
                'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad',
                'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal',
                'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula',
                'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'
            ],

            'Himachal Pradesh': [
                'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur',
                'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla',
                'Sirmaur', 'Solan', 'Una'
            ],

            'Jharkhand': [
                'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka',
                'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla',
                'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar',
                'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi',
                'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'
            ],

            'Karnataka': [
                'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural',
                'Bengaluru Urban', 'Bidar', 'Chamarajanagar',
                'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
                'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag',
                'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar',
                'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara',
                'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada',
                'Vijayanagara', 'Yadgir'
            ],

            'Kerala': [
                'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
                'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram',
                'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram',
                'Thrissur', 'Wayanad'
            ],

            'Madhya Pradesh': [
                'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat',
                'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur',
                'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas',
                'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad',
                'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa',
                'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur',
                'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam',
                'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol',
                'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli',
                'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'
            ],

            'Maharashtra': [
                'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed',
                'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli',
                'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur',
                'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur',
                'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar',
                'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli',
                'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha',
                'Washim', 'Yavatmal'
            ],

            'Manipur': [
                'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East',
                'Imphal West', 'Jiribam', 'Kakching', 'Kamjong',
                'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati',
                'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'
            ],

            'Meghalaya': [
                'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills',
                'North Garo Hills', 'Ri Bhoi', 'South Garo Hills',
                'South West Garo Hills', 'South West Khasi Hills',
                'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'
            ],

            'Mizoram': [
                'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl',
                'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit',
                'Saiha', 'Serchhip', 'Saitual'
            ],

            'Nagaland': [
                'Chümoukedima', 'Dimapur', 'Kiphire', 'Kohima',
                'Longleng', 'Mokokchung', 'Mon', 'Niuland',
                'Noklak', 'Peren', 'Phek', 'Shamator',
                'Tuensang', 'Tseminyü', 'Wokha', 'Zünheboto'
            ],

            'Odisha': [
                'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak',
                'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati',
                'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda',
                'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar',
                'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj',
                'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri',
                'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
            ],

            'Punjab': [
                'Amritsar', 'Barnala', 'Bathinda', 'Faridkot',
                'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur',
                'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
                'Malerkotla', 'Mansa', 'Moga', 'Mohali',
                'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar',
                'Sangrur', 'Shaheed Bhagat Singh Nagar', 'Tarn Taran'
            ],

            'Rajasthan': [
                'Ajmer', 'Alwar', 'Anupgarh', 'Balotra', 'Banswara',
                'Baran', 'Barmer', 'Beawar', 'Bharatpur', 'Bhilwara',
                'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa',
                'Deeg', 'Dholpur', 'Didwana-Kuchaman', 'Dudu',
                'Dungarpur', 'Gangapur City', 'Hanumangarh', 'Jaipur',
                'Jaipur Rural', 'Jaisalmer', 'Jalore', 'Jhalawar',
                'Jhunjhunu', 'Jodhpur', 'Jodhpur Rural', 'Karauli',
                'Kekri', 'Khairthal-Tijara', 'Kota', 'Kotputli-Behror',
                'Nagaur', 'Neem Ka Thana', 'Pali', 'Phalodi',
                'Pratapgarh', 'Rajsamand', 'Salumbar', 'Sanchore',
                'Sawai Madhopur', 'Shahpura', 'Sikar', 'Sirohi',
                'Sri Ganganagar', 'Tonk', 'Udaipur'
            ],

            'Sikkim': ['Gangtok', 'Gyalshing', 'Mangan', 'Namchi', 'Pakyong', 'Soreng'],

            'Tamil Nadu': [
                'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore',
                'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode',
                'Kallakurichi', 'Kanchipuram', 'Kanyakumari',
                'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
                'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur',
                'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem',
                'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni',
                'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
                'Tirupattur', 'Tiruppur', 'Tiruvallur',
                'Tiruvannamalai', 'Tiruvarur', 'Vellore',
                'Viluppuram', 'Virudhunagar'
            ],

            'Telangana': [
                'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad',
                'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally',
                'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam',
                'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar',
                'Mancherial', 'Medak', 'Medchal–Malkajgiri', 'Mulugu',
                'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal',
                'Nizamabad', 'Peddapalli', 'Rajanna Sircilla',
                'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet',
                'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
            ],

            'Tripura': [
                'Dhalai', 'Gomati', 'Khowai', 'North Tripura',
                'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'
            ],

            'Uttar Pradesh': [
                'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha',
                'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich',
                'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly',
                'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr',
                'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah',
                'Farrukhabad', 'Fatehpur', 'Firozabad',
                'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur',
                'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi',
                'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj',
                'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi',
                'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow',
                'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura',
                'Mau', 'Meerut', 'Mirzapur', 'Moradabad',
                'Muzaffarnagar', 'Pilibhit', 'Pratapgarh',
                'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur',
                'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur',
                'Shamli', 'Shrawasti', 'Siddharthnagar',
                'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'
            ],

            'Uttarakhand': [
                'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun',
                'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh',
                'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'
            ],

            'West Bengal': [
                'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar',
                'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah',
                'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata',
                'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas',
                'Paschim Bardhaman', 'Paschim Medinipur',
                'Purba Bardhaman', 'Purba Medinipur', 'Purulia',
                'South 24 Parganas', 'Uttar Dinajpur'
            ],

            // ===== UNION TERRITORIES =====

            'Andaman and Nicobar Islands': [
                'Nicobar', 'North and Middle Andaman', 'South Andaman'
            ],

            'Chandigarh': [
                'Chandigarh'
            ],

            'Dadra and Nagar Haveli and Daman and Diu': [
                'Dadra and Nagar Haveli',
                'Daman',
                'Diu'
            ],

            'Delhi': [
                'Central Delhi', 'East Delhi', 'New Delhi',
                'North Delhi', 'North East Delhi', 'North West Delhi',
                'South Delhi', 'South East Delhi', 'South West Delhi',
                'West Delhi', 'Shahdara'
            ],

            'Jammu and Kashmir': [
                'Anantnag', 'Bandipora', 'Baramulla', 'Budgam',
                'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar',
                'Kulgam', 'Kupwara', 'Poonch', 'Pulwama',
                'Rajouri', 'Ramban', 'Reasi', 'Samba',
                'Shopian', 'Srinagar', 'Udhampur'
            ],

            'Ladakh': [
                'Kargil', 'Leh'
            ],

            'Lakshadweep': [
                'Lakshadweep'
            ],

            'Puducherry': [
                'Karaikal', 'Mahe', 'Puducherry', 'Yanam'
            ]

        };

        this.locationData = {
            'India': this.statesData,
            'United States': this.getUSStateDistrictData()
        };

        this.populateCountryOptions();
        const countrySelect = document.getElementById('country');
        if (countrySelect && this.locationData['India']) {
            countrySelect.value = 'India';
        }
        this.loadStates('India');
    }

    getUSStateDistrictData() {
        return {
            'Alabama': ['Jefferson County', 'Mobile County', 'Madison County'],
            'Alaska': ['Anchorage Municipality', 'Fairbanks North Star Borough', 'Matanuska-Susitna Borough'],
            'Arizona': ['Maricopa County', 'Pima County', 'Pinal County'],
            'Arkansas': ['Pulaski County', 'Benton County', 'Washington County'],
            'California': ['Los Angeles County', 'San Diego County', 'Orange County'],
            'Colorado': ['Denver County', 'El Paso County', 'Arapahoe County'],
            'Connecticut': ['Fairfield County', 'Hartford County', 'New Haven County'],
            'Delaware': ['New Castle County', 'Kent County', 'Sussex County'],
            'Florida': ['Miami-Dade County', 'Broward County', 'Orange County'],
            'Georgia': ['Fulton County', 'Gwinnett County', 'Cobb County'],
            'Hawaii': ['Honolulu County', 'Hawaii County', 'Maui County'],
            'Idaho': ['Ada County', 'Canyon County', 'Kootenai County'],
            'Illinois': ['Cook County', 'DuPage County', 'Lake County'],
            'Indiana': ['Marion County', 'Lake County', 'Hamilton County'],
            'Iowa': ['Polk County', 'Linn County', 'Scott County'],
            'Kansas': ['Sedgwick County', 'Johnson County', 'Shawnee County'],
            'Kentucky': ['Jefferson County', 'Fayette County', 'Kenton County'],
            'Louisiana': ['East Baton Rouge Parish', 'Jefferson Parish', 'Orleans Parish'],
            'Maine': ['Cumberland County', 'York County', 'Penobscot County'],
            'Maryland': ['Montgomery County', 'Prince George\'s County', 'Baltimore County'],
            'Massachusetts': ['Middlesex County', 'Worcester County', 'Essex County'],
            'Michigan': ['Wayne County', 'Oakland County', 'Macomb County'],
            'Minnesota': ['Hennepin County', 'Ramsey County', 'Dakota County'],
            'Mississippi': ['Hinds County', 'Harrison County', 'DeSoto County'],
            'Missouri': ['St. Louis County', 'Jackson County', 'St. Charles County'],
            'Montana': ['Yellowstone County', 'Missoula County', 'Gallatin County'],
            'Nebraska': ['Douglas County', 'Lancaster County', 'Sarpy County'],
            'Nevada': ['Clark County', 'Washoe County', 'Carson City'],
            'New Hampshire': ['Hillsborough County', 'Rockingham County', 'Merrimack County'],
            'New Jersey': ['Bergen County', 'Middlesex County', 'Essex County'],
            'New Mexico': ['Bernalillo County', 'Doña Ana County', 'Santa Fe County'],
            'New York': ['Kings County', 'Queens County', 'New York County'],
            'North Carolina': ['Wake County', 'Mecklenburg County', 'Guilford County'],
            'North Dakota': ['Cass County', 'Burleigh County', 'Grand Forks County'],
            'Ohio': ['Cuyahoga County', 'Franklin County', 'Hamilton County'],
            'Oklahoma': ['Oklahoma County', 'Tulsa County', 'Cleveland County'],
            'Oregon': ['Multnomah County', 'Washington County', 'Clackamas County'],
            'Pennsylvania': ['Philadelphia County', 'Allegheny County', 'Montgomery County'],
            'Rhode Island': ['Providence County', 'Kent County', 'Washington County'],
            'South Carolina': ['Greenville County', 'Richland County', 'Charleston County'],
            'South Dakota': ['Minnehaha County', 'Pennington County', 'Lincoln County'],
            'Tennessee': ['Shelby County', 'Davidson County', 'Knox County'],
            'Texas': ['Harris County', 'Dallas County', 'Tarrant County'],
            'Utah': ['Salt Lake County', 'Utah County', 'Davis County'],
            'Vermont': ['Chittenden County', 'Rutland County', 'Washington County'],
            'Virginia': ['Fairfax County', 'Prince William County', 'Loudoun County'],
            'Washington': ['King County', 'Pierce County', 'Snohomish County'],
            'West Virginia': ['Kanawha County', 'Berkeley County', 'Monongalia County'],
            'Wisconsin': ['Milwaukee County', 'Dane County', 'Waukesha County'],
            'Wyoming': ['Laramie County', 'Natrona County', 'Campbell County']
        };
    }

    populateCountryOptions() {
        const countrySelect = document.getElementById('country');
        if (!countrySelect) return;

        const countries = Object.keys(this.locationData);
        countrySelect.innerHTML = '<option value="" selected disabled>Select country</option>';
        countries.forEach((country) => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
    }

    loadStates(country) {
        const stateSelect = document.getElementById('state');
        const districtSelect = document.getElementById('district');
        if (!stateSelect || !districtSelect) return;

        stateSelect.innerHTML = '<option value="" selected disabled>Select state</option>';
        districtSelect.innerHTML = '<option value="" selected disabled>Select district</option>';
        districtSelect.disabled = true;

        const statesMap = this.locationData[country];
        if (!statesMap) {
            stateSelect.disabled = true;
            return;
        }

        stateSelect.disabled = false;
        Object.keys(statesMap).sort((a, b) => a.localeCompare(b)).forEach((state) => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateSelect.appendChild(option);
        });
    }


    loadDistricts(state) {
        const country = document.getElementById('country')?.value;
        const districtSelect = document.getElementById('district');
        if (!districtSelect) return;

        districtSelect.innerHTML = '<option value="" selected disabled>Select district</option>';

        const statesMap = this.locationData[country] || {};
        if (statesMap[state]) {
            districtSelect.disabled = false;
            statesMap[state].forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        } else {
            districtSelect.disabled = true;
        }
    }

    async loadEducationData() {
        try {
            const response = await fetch('./education-master-data.json');
            if (!response.ok) {
                throw new Error('Failed to load education master data');
            }

            const payload = await response.json();
            const rows = Array.isArray(payload?.rows) ? payload.rows : [];

            this.educationMasterRows = rows
                .filter((row) => row.degreeType && row.degreeName)
                .map((row) => ({
                    degreeType: String(row.degreeType).trim(),
                    degreeName: String(row.degreeName).trim(),
                    specialization: String(row.specialization || '').trim()
                }));

            this.buildEducationLookups();
            this.populateEducationLevelOptions();
        } catch (error) {
            console.error('Education master data load error:', error);
            this.educationMasterRows = [];
            this.educationLevelOptions = [];
            this.degreeNamesByType = {};
            this.specializationsByTypeAndDegree = {};
        }
    }

    buildEducationLookups() {
        const levelSet = new Set();
        const degreeNamesByType = {};
        const specializationsByTypeAndDegree = {};

        this.educationMasterRows.forEach((row) => {
            levelSet.add(row.degreeType);

            if (!degreeNamesByType[row.degreeType]) {
                degreeNamesByType[row.degreeType] = new Set();
            }
            degreeNamesByType[row.degreeType].add(row.degreeName);

            const key = `${row.degreeType}|||${row.degreeName}`;
            if (!specializationsByTypeAndDegree[key]) {
                specializationsByTypeAndDegree[key] = new Set();
            }
            if (row.specialization) {
                specializationsByTypeAndDegree[key].add(row.specialization);
            }
        });

        this.educationLevelOptions = Array.from(levelSet).sort((a, b) => a.localeCompare(b));
        this.degreeNamesByType = Object.fromEntries(
            Object.entries(degreeNamesByType).map(([k, v]) => [k, Array.from(v).sort((a, b) => a.localeCompare(b))])
        );
        this.specializationsByTypeAndDegree = Object.fromEntries(
            Object.entries(specializationsByTypeAndDegree).map(([k, v]) => [k, Array.from(v).sort((a, b) => a.localeCompare(b))])
        );
    }

    populateEducationLevelOptions() {
        if (!this.educationLevelOptions.length) return;

        document.querySelectorAll('.education-level').forEach((selectEl) => {
            const currentValue = selectEl.value;
            selectEl.innerHTML = '<option value="" selected disabled>Select</option>';

            this.educationLevelOptions.forEach((level) => {
                const option = document.createElement('option');
                option.value = level;
                option.textContent = level;
                selectEl.appendChild(option);
            });

            if (currentValue && this.educationLevelOptions.includes(currentValue)) {
                selectEl.value = currentValue;
            }

            this.handleEducationLevelChange(selectEl, true);
        });
    }

    async loadUniversityData() {
        // Mock API call for universities
        this.universities = [
            'KIIT University',
            'Siksha O Anusandhan University',
            'National Institute of Technology',
            'Indian Institute of Technology',
            'University of Hyderabad',
            'Osmania University',
            'Jawaharlal Nehru Technological University',
            'Utkal University',
            'Ravenshaw University',
            'Sri Sri University'
        ];
    }

    getEntryLevelAndQualification(inputOrEntry) {
        const entry = inputOrEntry?.classList?.contains('education-entry')
            ? inputOrEntry
            : inputOrEntry?.closest('.education-entry');
        return {
            level: entry?.querySelector('.education-level')?.value?.trim() || '',
            qualification: entry?.querySelector('.qualification')?.value?.trim() || ''
        };
    }

    showUniversitySuggestions(input) {
        const index = input.dataset.index;
        const suggestionsDiv = document.getElementById(`uniSuggestions${index}`);
        if (!suggestionsDiv) return;

        const value = input.value.toLowerCase();

        if (value.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        const suggestions = this.universities.filter(uni =>
            uni.toLowerCase().includes(value)
        );

        suggestionsDiv.innerHTML = suggestions.map(uni =>
            `<div class="suggestion-item" onclick="onboardingForm.selectUniversity('${index}', '${uni.replace(/'/g, "\\'")}')">${uni}</div>`
        ).join('');

        suggestionsDiv.style.display = suggestions.length > 0 ? 'block' : 'none';
    }

    selectUniversity(index, university) {
        const input = document.querySelector(`.board-university[data-index="${index}"]`);
        if (input) {
            input.value = university;
            const suggestionsDiv = document.getElementById(`uniSuggestions${index}`);
            if (suggestionsDiv) {
                suggestionsDiv.style.display = 'none';
            }
        }
    }

    populateQualificationOptions(entry, preserveExisting = false) {
        if (!entry) return;
        const qualificationSelect = entry.querySelector('.qualification');
        if (!qualificationSelect) return;

        const currentValue = qualificationSelect.value;
        const { level } = this.getEntryLevelAndQualification(entry);
        const options = level ? (this.degreeNamesByType[level] || []) : [];

        qualificationSelect.innerHTML = '<option value="" selected disabled>Select qualification</option>';
        options.forEach((qualification) => {
            const option = document.createElement('option');
            option.value = qualification;
            option.textContent = qualification;
            qualificationSelect.appendChild(option);
        });

        if (preserveExisting && currentValue && options.includes(currentValue)) {
            qualificationSelect.value = currentValue;
        }
    }

    populateSpecializationOptions(entry, preserveExisting = false) {
        if (!entry) return;
        const specializationSelect = entry.querySelector('.specialization');
        if (!specializationSelect) return;

        const currentValue = specializationSelect.value;
        const { level, qualification } = this.getEntryLevelAndQualification(entry);
        const key = `${level}|||${qualification}`;
        const options = this.specializationsByTypeAndDegree[key] || [];

        specializationSelect.innerHTML = '<option value="" selected disabled>Select specialization</option>';
        options.forEach((specialization) => {
            const option = document.createElement('option');
            option.value = specialization;
            option.textContent = specialization;
            specializationSelect.appendChild(option);
        });

        if (preserveExisting && currentValue && options.includes(currentValue)) {
            specializationSelect.value = currentValue;
        }
    }

    handleEducationLevelChange(selectInput, preserveExisting = false) {
        if (!selectInput) return;
        const entry = selectInput.closest('.education-entry');
        this.populateQualificationOptions(entry, preserveExisting);

        const specializationSelect = entry?.querySelector('.specialization');
        if (specializationSelect && !preserveExisting) {
            specializationSelect.innerHTML = '<option value="" selected disabled>Select specialization</option>';
        }

        const qualificationSelect = entry?.querySelector('.qualification');
        if (qualificationSelect && qualificationSelect.value) {
            this.handleQualificationChange(qualificationSelect, preserveExisting);
        }
    }

    handleQualificationChange(qualificationInput, preserveExisting = false) {
        if (!qualificationInput) return;
        const entry = qualificationInput.closest('.education-entry');
        this.populateSpecializationOptions(entry, preserveExisting);
    }

    toggleEntrySection(button) {
        const entry = button.closest('.collapsible-entry');
        if (!entry) return;

        const body = entry.querySelector('.entry-body');
        const icon = button.querySelector('i');
        if (!body || !icon) return;

        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        icon.className = isOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }


    // education section
    addEducationEntry() {
        const container = document.getElementById('educationContainer');
        if (!container) return;

        const newEntry = document.createElement('div');
        newEntry.className = 'education-entry collapsible-entry mb-4 p-3 border rounded position-relative';
        newEntry.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="entry-title mb-0">Education Entry ${this.educationCount + 1}</h6>
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="onboardingForm.toggleEntrySection(this)">
                    <i class="fas fa-chevron-up"></i>
                </button>
            </div>
            <div class="entry-body">
            <div class="row pt-2 mt-2 g-3">
                <div class="col-md-2">
                    <div class="floating-input">
                        <label for="educationLevel${this.educationCount}">Level</label>
                        <select class="education-level" data-index="${this.educationCount}" required>
                            <option value="" selected disabled>Select</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="floating-input">
                        <label for="qualification${this.educationCount}">Qualification</label>
                        <select class="qualification" data-index="${this.educationCount}" required>
                            <option value="" selected disabled>Select qualification</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="floating-input">
                        <label for="specialization${this.educationCount}">Specialization</label>
                        <select class="specialization" data-index="${this.educationCount}" required>
                            <option value="" selected disabled>Select specialization</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="floating-input">
                        <label for="yearOfPassing${this.educationCount}">Year of Passing</label>
                        <input type="text" class="year-of-passing" data-index="${this.educationCount}" placeholder="Select date" required>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="floating-input">
                        <label for="cgpa${this.educationCount}">CGPA / %</label>
                        <input type="text" class="cgpa" data-index="${this.educationCount}" placeholder="e.g., 8.2 / 82%" required>
                    </div>
                </div>
            </div>
            <div class="row g-3 mt-0">
                <div class="col-md-6">
                    <div class="floating-input">
                        <label for="boardUniversity${this.educationCount}">Board/University</label>
                        <input type="text" class="board-university" data-index="${this.educationCount}" placeholder="Start typing..." required>
                        <div class="university-suggestions" id="uniSuggestions${this.educationCount}"></div>
                    </div>
                </div>
            </div>
            <!-- Remove button for education entry -->
            <div class="remove-education-btn mt-3 text-end">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="onboardingForm.removeEducationEntry(${this.educationCount})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            </div>
        `;

        container.appendChild(newEntry);
        this.initializeDatePickers(newEntry);
        this.applyMandatoryIndicators(newEntry);
        this.populateEducationLevelOptions();
        this.disableValidationForTesting();

        // Show remove button for all entries except the first one
        const allEntries = document.querySelectorAll('.education-entry');
        if (allEntries.length > 1) {
            // Show remove button for the new entry
            const removeBtn = newEntry.querySelector('.remove-education-btn');
            if (removeBtn) {
                removeBtn.style.display = 'block';
            }

            // Also show remove button for the first entry if it was hidden
            if (allEntries.length === 2) {
                const firstRemoveBtn = allEntries[0].querySelector('.remove-education-btn');
                if (firstRemoveBtn) {
                    firstRemoveBtn.style.display = 'block';
                }
            }
        }

        this.educationCount++;
        this.updateHighestQualificationField();
    }

    // Remove education entry
    removeEducationEntry(index) {
        const entries = document.querySelectorAll('.education-entry');

        // Find the entry to remove
        let entryToRemove = null;
        entries.forEach(entry => {
            const inputs = entry.querySelectorAll('[data-index]');
            inputs.forEach(input => {
                if (input.dataset.index == index) {
                    entryToRemove = entry;
                }
            });
        });

        if (entries.length <= 1) {
            this.showNotification('You must keep at least one education entry', 'warning');
            return;
        }

        if (entryToRemove) {
            // Remove uploaded file record
            delete this.uploadedFiles.education[index];

            // Remove the entry
            entryToRemove.remove();

            // Re-index remaining entries
            this.reindexEducationEntries();
            this.updateHighestQualificationField();

            this.showNotification('Education entry removed successfully', 'success');
        }
    }

    // Re-index education entries after removal
    reindexEducationEntries() {
        const entries = document.querySelectorAll('.education-entry');
        let newIndex = 0;

        entries.forEach((entry, index) => {
            // Update all inputs with data-index attribute
            const inputs = entry.querySelectorAll('[data-index]');
            inputs.forEach(input => {
                input.dataset.index = newIndex;

                // Update IDs
                const inputName = input.className.split(' ')[0];
                if (inputName) {
                    input.id = `${inputName}${newIndex}`;
                }

                if (input.classList.contains('board-university')) {
                    const suggestionsDiv = input.nextElementSibling;
                    if (suggestionsDiv && suggestionsDiv.classList.contains('university-suggestions')) {
                        suggestionsDiv.id = `uniSuggestions${newIndex}`;
                    }
                }
            });

            // Update remove button onclick
            const removeBtn = entry.querySelector('.remove-education-btn button');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `onboardingForm.removeEducationEntry(${newIndex})`);
            }

            const titleEl = entry.querySelector('.entry-title');
            if (titleEl) {
                titleEl.textContent = `Education Entry ${newIndex + 1}`;
            }

            // Update uploaded files mapping
            if (this.uploadedFiles.education[index + 1]) {
                this.uploadedFiles.education[newIndex] = this.uploadedFiles.education[index + 1];
                delete this.uploadedFiles.education[index + 1];
            }

            newIndex++;
        });

        this.educationCount = entries.length;
    }

    getHighestQualificationFromEntries() {
        const entries = document.querySelectorAll('.education-entry');
        let latestTimestamp = -Infinity;
        let highestQualification = '';
        let highestQualificationYear = '';

        entries.forEach((entry) => {
            const yearValue = entry.querySelector('.year-of-passing')?.value || '';
            const qualificationValue = entry.querySelector('.qualification')?.value || '';
            if (!yearValue || !qualificationValue) return;

            const parsedDate = new Date(yearValue);
            const timestamp = parsedDate.getTime();
            if (Number.isNaN(timestamp)) return;

            if (timestamp >= latestTimestamp) {
                latestTimestamp = timestamp;
                highestQualification = qualificationValue;
                highestQualificationYear = String(parsedDate.getFullYear());
            }
        });

        return {
            qualification: highestQualification,
            passingYear: highestQualificationYear
        };
    }

    updateHighestQualificationField() {
        const highestQualificationInput = document.getElementById('highestQualification');
        const highestQualificationYearInput = document.getElementById('highestQualificationYear');
        if (!highestQualificationInput) return;

        const highestQualificationDetails = this.getHighestQualificationFromEntries();
        highestQualificationInput.value = highestQualificationDetails.qualification;
        if (highestQualificationYearInput) {
            highestQualificationYearInput.value = highestQualificationDetails.passingYear;
        }
    }



    // Updated addExperienceEntry method with remove button
    addExperienceEntry() {
        const container = document.getElementById('experienceContainer');
        if (!container) return;
        const entryIndex = this.experienceCount;

        const newEntry = document.createElement('div');
        newEntry.className = 'experience-entry collapsible-entry mb-4 p-3 border rounded position-relative';
        newEntry.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <h6 class="entry-title mb-0">Experience Entry ${entryIndex + 1}</h6>
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="onboardingForm.toggleEntrySection(this)">
                    <i class="fas fa-chevron-up"></i>
                </button>
            </div>
            <div class="entry-body">
            <div class="row pt-2 mt-2 g-3">
                <div class="col-md-3">
                    <div class="floating-input">
                        <label for="organization${entryIndex}">Organization</label>
                        <input type="text" class="organization" data-index="${entryIndex}" placeholder="Company name" required>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="floating-input">
                        <label for="designation${entryIndex}">Designation</label>
                        <input type="text" class="designation" data-index="${entryIndex}" placeholder="Your position" required>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="floating-input">
                        <label for="experienceAddress${entryIndex}">Company Address</label>
                        <input type="text" class="experience-address" data-index="${entryIndex}" placeholder="Company address">
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="floating-input">
                        <label for="companyContact${entryIndex}">Company Contact</label>
                        <input type="tel" class="company-contact" data-index="${entryIndex}" placeholder="Company phone">
                    </div>
                </div>
            </div>
            
            <div class="row g-3 mt-2">
                <div class="col-md-3">
                    <div class="floating-input">
                        <label for="fromDate${entryIndex}">From Date</label>
                        <input type="text" class="from-date" data-index="${entryIndex}" placeholder="Select date" required>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="floating-input">
                        <label for="toDate${entryIndex}">To Date</label>
                        <input type="text" class="to-date" data-index="${entryIndex}" placeholder="Select date" required>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="floating-input">
                        <label for="ctc${entryIndex}">CTC (Annual)</label>
                        <input type="text" class="ctc" data-index="${entryIndex}" placeholder="e.g., 6 LPA">
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="floating-input">
                        <label for="reasonForLeaving${entryIndex}">Reason for Leaving</label>
                        <input type="text" class="reason-for-leaving" data-index="${entryIndex}" placeholder="Why you left">
                    </div>
                </div>
            </div>

            <!-- Remove button for experience entry -->
            <div class="remove-experience-btn mt-3 text-end">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="onboardingForm.removeExperienceEntry(${entryIndex})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            </div>
        `;

        container.appendChild(newEntry);
        this.initializeDatePickers(newEntry);
        this.applyMandatoryIndicators(newEntry);
        this.disableValidationForTesting();

        this.experienceCount++;

        // Show remove button only if there's more than one entry
        this.updateExperienceRemoveButtons();
    }

    // Remove experience entry
    removeExperienceEntry(index) {
        const entries = document.querySelectorAll('.experience-entry');

        // Find the entry to remove
        let entryToRemove = null;
        entries.forEach(entry => {
            const inputs = entry.querySelectorAll('[data-index]');
            inputs.forEach(input => {
                if (input.dataset.index == index) {
                    entryToRemove = entry;
                }
            });
        });

        if (!entryToRemove || entries.length <= 1) {
            this.showNotification('You must keep at least one experience entry when "Yes" is selected', 'warning');
            return;
        }

        if (entryToRemove) {
            // Remove uploaded file record
            delete this.uploadedFiles.experience[index];

            // Remove the entry
            entryToRemove.remove();

            // Re-index remaining entries
            this.reindexExperienceEntries();

            this.showNotification('Experience entry removed successfully', 'success');
        }
    }

    // Re-index experience entries after removal
    reindexExperienceEntries() {
        const entries = document.querySelectorAll('.experience-entry');
        let newIndex = 0;

        entries.forEach((entry, index) => {
            // Update all inputs with data-index attribute
            const inputs = entry.querySelectorAll('[data-index]');
            inputs.forEach(input => {
                input.dataset.index = newIndex;

                // Update IDs
                const inputName = input.className.split(' ')[0];
                if (inputName) {
                    input.id = `${inputName}${newIndex}`;
                }
            });

            // Update remove button onclick
            const removeBtn = entry.querySelector('.remove-experience-btn button');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `onboardingForm.removeExperienceEntry(${newIndex})`);
            }

            const titleEl = entry.querySelector('.entry-title');
            if (titleEl) {
                titleEl.textContent = `Experience Entry ${newIndex + 1}`;
            }

            // Update uploaded files mapping
            if (this.uploadedFiles.experience[index + 1]) {
                this.uploadedFiles.experience[newIndex] = this.uploadedFiles.experience[index + 1];
                delete this.uploadedFiles.experience[index + 1];
            }

            newIndex++;
        });

        this.experienceCount = entries.length;
        this.updateExperienceRemoveButtons();
    }

    updateExperienceRemoveButtons() {
        const entries = document.querySelectorAll('.experience-entry');
        const removeButtons = document.querySelectorAll('.remove-experience-btn');

        // Hide remove button if only one entry exists
        if (entries.length <= 1) {
            removeButtons.forEach(btn => btn.style.display = 'none');
        } else {
            removeButtons.forEach(btn => btn.style.display = 'block');
        }
    }




    handleCertificateUpload(e, index) {
        const file = e.target.files[0];
        if (file && file.size <= 2 * 1024 * 1024) {
            if (!this.uploadedFiles.education[index]) {
                this.uploadedFiles.education[index] = {};
            }
            this.uploadedFiles.education[index].certificate = file;

            const box = e.target.closest('.upload-box');
            if (box) {
                box.innerHTML = `
                        <i class="fa-solid fa-file-circle-check upload-icon" style="color:green;"></i>
                        <span class="upload-text" style="color:green;">${file.name}</span>
                    `;
            }
        }
    }

    handleExperienceUpload(file, index, type, inputElement = null) {
        if (file && file.size <= 2 * 1024 * 1024) {
            if (!this.uploadedFiles.experience[index]) {
                this.uploadedFiles.experience[index] = {};
            }
            this.uploadedFiles.experience[index][type] = file;

            const box = inputElement?.closest('.upload-box') ||
                document.querySelector(`[data-index="${index}"][data-type="${type}"]`);
            if (box) {
                const icon = box.querySelector('.upload-icon');
                const text = box.querySelector('.upload-text');

                if (icon) {
                    icon.className = 'fa-solid fa-file-circle-check upload-icon';
                    icon.style.color = 'green';
                }

                if (text) {
                    text.textContent = file.name;
                    text.style.color = 'green';
                }
            }
        }
    }

    toggleExperienceSection(show) {
        const container = document.getElementById('experienceContainer');
        const addBtn = document.getElementById('addExperienceBtn');
        const removeBtn = document.getElementById('removeExperienceBtn');

        if (container && addBtn) {
            if (show) {
                container.style.display = 'block';
                addBtn.style.display = 'block';
                if (removeBtn) {
                    removeBtn.style.display = 'block';
                }
                // Only add first experience entry if none exists
                // if (this.experienceCount === 0) {
                //     this.addExperienceEntry();
                // }
            } else {
                container.style.display = 'none';
                addBtn.style.display = 'none';
                if (removeBtn) {
                    removeBtn.style.display = 'none';
                }
            }
        }
    }

    clearExperienceValidation() {
        const container = document.getElementById('experienceContainer');
        if (container) {
            container.querySelectorAll('input, select').forEach(input => {
                input.classList.remove('is-invalid');
                this.removeFieldError(input);
            });
        }
    }

    toggleConditionalFields(name, value) {
        const fieldMap = {
            'previousInterview': 'previousInterviewDetails',
            'criminalCase': 'criminalCaseDetails',
            'disability': 'disabilityDetails'
        };

        const detailsDiv = document.getElementById(fieldMap[name]);
        if (detailsDiv) {
            detailsDiv.style.display = value === 'Yes' ? 'block' : 'none';
        }
    }

    // Navigation Methods
    getVisibleSectionNumber() {
        const activeElSection = document.activeElement?.closest?.('.form-section');
        if (activeElSection?.id) {
            const activeMatch = activeElSection.id.match(/^section(\d+)$/);
            if (activeMatch) {
                return Number(activeMatch[1]);
            }
        }

        const visibleSection = Array.from(document.querySelectorAll('.form-section'))
            .find((section) => window.getComputedStyle(section).display !== 'none');
        if (!visibleSection) return this.currentSection;

        const match = visibleSection.id.match(/^section(\d+)$/);
        return match ? Number(match[1]) : this.currentSection;
    }

    getFirstInvalidFieldLabel(section) {
        const sectionEl = document.getElementById(`section${section}`);
        if (!sectionEl) return '';

        const firstInvalid = sectionEl.querySelector('.is-invalid');
        if (!firstInvalid) return '';

        const wrapper = firstInvalid.closest('.floating-input');
        const labelText = wrapper?.querySelector('label')?.textContent?.replace('*', '').trim();
        return labelText || '';
    }

    async nextSection(next) {
        console.log(`Attempting to navigate to section ${next} from section ${this.currentSection}`);
        this.currentSection = this.getVisibleSectionNumber();

        if (this.currentSection === 2) {
            const employeeIdAllowed = await this.validateEmployeeIdAvailability({
                showNotification: true,
                markField: true
            });
            if (!employeeIdAllowed) {
                this.scrollToFirstInvalid();
                return false;
            }
        }

        if (this.validateSection(this.currentSection)) {
            // Hide current section
            const currentSectionEl = document.getElementById(`section${this.currentSection}`);
            if (currentSectionEl) {
                currentSectionEl.style.display = 'none';
            }

            // Show next section
            const nextSectionEl = document.getElementById(`section${next}`);
            if (nextSectionEl) {
                nextSectionEl.style.display = 'block';
                this.currentSection = next;
                this.updateProgress();

                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });

                console.log(`Successfully navigated to section ${next}`);
                return true;
            }
        } else {
            const fieldLabel = this.getFirstInvalidFieldLabel(this.currentSection);
            const message = fieldLabel
                ? `Please fill all required fields in this section. Check: ${fieldLabel}`
                : 'Please fill all required fields in this section.';
            this.showNotification(message, 'error');
            this.scrollToFirstInvalid();
        }

        return false;
    }

    prevSection(prev) {
        console.log(`Navigating back to section ${prev} from section ${this.currentSection}`);

        // Hide current section
        const currentSectionEl = document.getElementById(`section${this.currentSection}`);
        if (currentSectionEl) {
            currentSectionEl.style.display = 'none';
        }

        // Show previous section
        const prevSectionEl = document.getElementById(`section${prev}`);
        if (prevSectionEl) {
            prevSectionEl.style.display = 'block';
            this.currentSection = prev;
            this.updateProgress();

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            console.log(`Successfully navigated back to section ${prev}`);
        }
    }

    // Updated validateSection method with document validation
    validateSection(section, silent = false) {
        if (this.testingMode) return true;

        let isValid = true;
        const sectionEl = document.getElementById(`section${section}`);

        if (!sectionEl) {
            console.error(`Section ${section} not found`);
            return false;
        }

        // Reset all invalid states first
        const inputs = sectionEl.querySelectorAll('[required]');
        inputs.forEach(input => {
            input.classList.remove('is-invalid');
            this.removeFieldError(input);
        });

        if (section === 3) {
            this.syncPassportValidation();
        }

        // Special handling for section 6 (Work Experience)
        if (section === 6) {
            const hasExperienceYes = document.getElementById('hasExperienceYes');
            const hasExperienceNo = document.getElementById('hasExperienceNo');

            // Check if any radio is selected
            if (!hasExperienceYes.checked && !hasExperienceNo.checked) {
                isValid = false;
                if (!silent) {
                    const errorDiv = document.getElementById('experienceError');
                    if (errorDiv) {
                        errorDiv.style.display = 'block';
                    }
                }
                return false;
            } else {
                const errorDiv = document.getElementById('experienceError');
                if (errorDiv) {
                    errorDiv.style.display = 'none';
                }
            }

            // If "No" is selected, no need to validate experience fields
            if (hasExperienceNo.checked) {
                return true;
            }

            // If "Yes" is selected, validate experience fields
            if (hasExperienceYes.checked) {
                const experienceEntries = document.querySelectorAll('.experience-entry');
                if (experienceEntries.length === 0) {
                    if (!silent) {
                        this.showNotification('Please add at least one work experience', 'error');
                    }
                    return false;
                }

                // Validate each experience entry based on required fields only
                experienceEntries.forEach((entry) => {
                    const requiredFields = entry.querySelectorAll('[required]');
                    requiredFields.forEach(field => {
                        const value = field.value.trim();

                        if (!value) {
                            isValid = false;
                            if (!silent) {
                                field.classList.add('is-invalid');
                                this.showFieldError(field, 'This field is required');
                            }
                        }
                    });

                    // Custom date range validation for each experience row
                    if (!this.validateExperienceDateRange(entry, silent)) {
                        isValid = false;
                    }
                });

                if (!this.validateExperienceOverlaps(silent)) {
                    isValid = false;
                }
            }

            return isValid;
        }

        // For other sections, validate normally
        inputs.forEach(input => {
            const value = input.value.trim();

            // Skip validation for radio buttons in conditional sections
            if (input.type === 'radio') {
                const radioName = input.name;
                const radioGroup = sectionEl.querySelectorAll(`input[name="${radioName}"]:checked`);
                if (radioGroup.length === 0) {
                    isValid = false;
                    if (!silent) {
                        const firstRadio = sectionEl.querySelector(`input[name="${radioName}"]`);
                        if (firstRadio) {
                            firstRadio.classList.add('is-invalid');
                            const errorDiv = document.getElementById(`${radioName}Error`) ||
                                firstRadio.closest('.form-check')?.nextElementSibling;
                            if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
                                errorDiv.style.display = 'block';
                            }
                        }
                    }
                }
                return; // Skip further validation for radios
            }

            // Skip validation for checkboxes that are conditionally shown
            if (input.type === 'checkbox') {
                // Only validate if checkbox is visible and required
                if (!input.checked && input.required) {
                    isValid = false;
                    if (!silent) {
                        input.classList.add('is-invalid');
                        this.showFieldError(input, 'You must agree to this term');
                    }
                }
                return;
            }

            // Skip validation for file inputs in sections other than Address & ID
            if (input.type === 'file' && section !== 3) {
                return;
            }

            // Handle file inputs
            if (input.type === 'file') {
                const hasAadharUploadField = !!document.getElementById('aadharFile');
                if (section === 3 && hasAadharUploadField && input.id === 'aadharFile') {
                    if (this.uploadedFiles.aadhar.length === 0) {
                        isValid = false;
                        if (!silent) {
                            input.classList.add('is-invalid');
                            this.showFieldError(input, 'Please upload Aadhar card files');
                        }
                    }
                }
                return;
            }

            // Basic required validation for other fields
            if (!value) {
                isValid = false;
                if (!silent) {
                    input.classList.add('is-invalid');
                    this.showFieldError(input, 'This field is required');
                }
                return;
            }

            // Type-specific validation
            if (!this.validateFieldType(input, value)) {
                isValid = false;
            }
        });

        // Special validation for section 3 (Aadhar files)
        const hasAadharUploadField = !!document.getElementById('aadharFile');
        if (section === 3 && hasAadharUploadField && this.uploadedFiles.aadhar.length === 0 && !silent) {
            isValid = false;
            const uploadBox = document.getElementById('aadharUploadBox');
            if (uploadBox) {
                uploadBox.style.borderColor = '#dc3545';
                uploadBox.style.boxShadow = '0 0 0 4px rgba(220, 53, 69, 0.2)';

                // Reset after 3 seconds
                setTimeout(() => {
                    uploadBox.style.borderColor = '';
                    uploadBox.style.boxShadow = '';
                }, 3000);
            }
            this.showNotification('Please upload Aadhar card files', 'error');
        }

        if (section === 1) {
            const fullNameInput = document.getElementById('fullName');
            const emergencyNameInput = document.getElementById('emergencyContactName');
            const contactNumberInput = document.getElementById('contactNumber');
            const emergencyNumberInput = document.getElementById('emergencyContactNumber');

            const fullName = (fullNameInput?.value || '').trim().toLowerCase().replace(/\s+/g, ' ');
            const emergencyName = (emergencyNameInput?.value || '').trim().toLowerCase().replace(/\s+/g, ' ');
            const contactNumber = (contactNumberInput?.value || '').trim();
            const emergencyNumber = (emergencyNumberInput?.value || '').trim();

            if (fullName && emergencyName && fullName === emergencyName) {
                isValid = false;
                if (!silent && emergencyNameInput) {
                    emergencyNameInput.classList.add('is-invalid');
                    this.showFieldError(emergencyNameInput, 'Emergency contact name must be different from full name');
                }
            }

            if (contactNumber && emergencyNumber && contactNumber === emergencyNumber) {
                isValid = false;
                if (!silent && emergencyNumberInput) {
                    emergencyNumberInput.classList.add('is-invalid');
                    this.showFieldError(emergencyNumberInput, 'Emergency contact number must be different from contact number');
                }
            }
        }

        return isValid;
    }

    scrollToFirstInvalid() {
        const firstInvalid = document.querySelector('.is-invalid');
        if (firstInvalid) {
            firstInvalid.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Focus on the field
            setTimeout(() => {
                firstInvalid.focus();
            }, 500);
        }
    }

    updateProgress() {
        const progress = (this.currentSection / 6) * 100;
        const progressBar = document.getElementById('formProgress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index < this.currentSection) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateSection(6)) {
            this.showNotification('Please fill all required fields in this section', 'error');
            return;
        }

        // Show summary modal
        this.showSummaryModal();
    }

    showSummaryModal() {
        const summaryContent = document.getElementById('summaryContent');
        if (!summaryContent) return;

        const formData = this.collectFormData();
        const displayValue = (value) => value && String(value).trim() ? value : 'N/A';

        let html = `
                <div class="summary-section mb-4">
                    <h6 class="text-primary"><i class="fas fa-user me-2"></i>Personal Information</h6>
                    <div class="row">
                        <div class="col-md-6"><strong>Salutation:</strong> ${displayValue(formData.personal.salutation)}</div>
                        <div class="col-md-6"><strong>Full Name:</strong> ${displayValue(formData.personal.fullName)}</div>
                        <div class="col-md-6"><strong>Father's Name:</strong> ${displayValue(formData.personal.fatherName)}</div>
                        <div class="col-md-6"><strong>Contact Number:</strong> ${displayValue(formData.personal.contactNumber)}</div>
                        <div class="col-md-6"><strong>Gender:</strong> ${displayValue(formData.personal.gender)}</div>
                        <div class="col-md-6"><strong>Marital Status:</strong> ${displayValue(formData.personal.maritalStatus)}</div>
                        <div class="col-md-6"><strong>Date of Birth:</strong> ${displayValue(formData.personal.dateOfBirth)}</div>
                        <div class="col-md-6"><strong>Blood Group:</strong> ${displayValue(formData.personal.bloodGroup)}</div>
                        <div class="col-md-6"><strong>Emergency Contact Name:</strong> ${displayValue(formData.personal.emergencyContactName)}</div>
                        <div class="col-md-6"><strong>Emergency Contact Number:</strong> ${displayValue(formData.personal.emergencyContactNumber)}</div>
                        <div class="col-md-6"><strong>Emergency Contact Relation:</strong> ${displayValue(formData.personal.emergencyContactRelation)}</div>
                    </div>
                </div>
            `;

        html += `
                <div class="summary-section mb-4">
                    <h6 class="text-primary"><i class="fas fa-id-badge me-2"></i>Employee Details</h6>
                    <div class="row">
                        <div class="col-md-6"><strong>Employee ID:</strong> ${displayValue(formData.employeeDetails.employeeId)}</div>
                        <div class="col-md-6"><strong>Date of Joining:</strong> ${displayValue(formData.employeeDetails.dateOfJoining)}</div>
                        <div class="col-md-6"><strong>Personal Email:</strong> ${displayValue(formData.employeeDetails.personalEmail)}</div>
                        <div class="col-md-6"><strong>Company Email:</strong> ${displayValue(formData.employeeDetails.companyEmail)}</div>
                    </div>
                </div>
            `;

        html += `
                <div class="summary-section mb-4">
                    <h6 class="text-primary"><i class="fas fa-home me-2"></i>Address Details</h6>
                    <div class="row">
                        <div class="col-md-6"><strong>Current Address:</strong> ${displayValue(formData.address.currentAddress)}</div>
                        <div class="col-md-6"><strong>Permanent Address:</strong> ${displayValue(formData.address.permanentAddress)}</div>
                        <div class="col-md-6"><strong>Country:</strong> ${displayValue(formData.address.country)}</div>
                        <div class="col-md-6"><strong>State:</strong> ${displayValue(formData.address.state)}</div>
                        <div class="col-md-6"><strong>District:</strong> ${displayValue(formData.address.district)}</div>
                        <div class="col-md-6"><strong>City:</strong> ${displayValue(formData.address.city)}</div>
                        <div class="col-md-6"><strong>Pincode:</strong> ${displayValue(formData.address.pincode)}</div>
                    </div>
                </div>
            `;

        html += `
                <div class="summary-section mb-4">
                    <h6 class="text-primary"><i class="fas fa-id-card me-2"></i>Identification Details</h6>
                    <div class="row">
                        <div class="col-md-6"><strong>Aadhar Number:</strong> ${displayValue(formData.identification.aadharNumber)}</div>
                        <div class="col-md-6"><strong>UAN Number:</strong> ${displayValue(formData.identification.uanNumber)}</div>
                        <div class="col-md-6"><strong>PAN Number:</strong> ${displayValue(formData.identification.panNumber)}</div>
                        <div class="col-md-6"><strong>Passport Number:</strong> ${displayValue(formData.identification.passportNumber)}</div>
                        <div class="col-md-6"><strong>Passport Valid Upto:</strong> ${displayValue(formData.identification.passportValidUpto)}</div>
                    </div>
                </div>
            `;

        html += `
                <div class="summary-section mb-4">
                    <h6 class="text-primary"><i class="fas fa-building-columns me-2"></i>Bank Details</h6>
                    <div class="row">
                        <div class="col-md-6"><strong>Bank Name:</strong> ${displayValue(formData.bank.bankName)}</div>
                        <div class="col-md-6"><strong>Account No:</strong> ${displayValue(formData.bank.accountNumber)}</div>
                        <div class="col-md-6"><strong>IFSC Code:</strong> ${displayValue(formData.bank.ifscCode)}</div>
                        <div class="col-md-6"><strong>Bank Holder Name:</strong> ${displayValue(formData.bank.bankHolderName)}</div>
                    </div>
                </div>
            `;

        if (formData.education && formData.education.length > 0) {
            html += `
                    <div class="summary-section mb-4">
                        <h6 class="text-primary"><i class="fas fa-graduation-cap me-2"></i>Education Details</h6>
                        <div class="col-md-12 mb-2"><strong>Highest Qualification:</strong> ${displayValue(formData.other.highestQualification)}</div>
                        <div class="col-md-12 mb-2"><strong>Passing Year (Highest Qualification):</strong> ${displayValue(formData.other.highestQualificationPassingYear)}</div>
                        ${formData.education.map(edu => `
                            <div class="education-summary mb-2 p-2 bg-light rounded">
                                <strong>${edu.level}</strong> - ${edu.qualification}<br>
                                <small>${edu.specialization || 'N/A'} | ${edu.boardUniversity} | ${edu.cgpa} | ${edu.yearOfPassing}</small>
                            </div>
                        `).join('')}
                    </div>
                `;
        }

        if (formData.experience && formData.experience.length > 0) {
            html += `
                    <div class="summary-section mb-4">
                        <h6 class="text-primary"><i class="fas fa-briefcase me-2"></i>Work Experience</h6>
                        ${formData.experience.map(exp => `
                            <div class="experience-summary mb-2 p-2 bg-light rounded">
                                <strong>${exp.designation}</strong> at ${exp.organization}<br>
                                <small>${exp.fromDate} to ${exp.toDate || 'Present'}</small>
                            </div>
                        `).join('')}
                    </div>
                `;
        }

        html += `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    All required information has been provided.
                </div>

                <div class="terms-section mt-4">
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" id="detailsConfirmation" />
                        <label class="form-check-label" for="detailsConfirmation">
                            I confirm that all the details furnished by me are accurate and complete. I acknowledge that any false or incorrect information may result in strict action by the HR department.
                        </label>
                    </div>
                </div>
            `;

        summaryContent.innerHTML = html;

        const modalElement = document.getElementById('summaryModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    collectFormData() {
        return {
            personal: {
                salutation: document.getElementById('salutation')?.value || '',
                employeeId: document.getElementById('employeeId')?.value || '',
                fullName: document.getElementById('fullName')?.value || '',
                fatherName: document.getElementById('fatherName')?.value || '',
                contactNumber: document.getElementById('contactNumber')?.value || '',
                gender: document.getElementById('gender')?.value || '',
                maritalStatus: document.getElementById('maritalStatus')?.value || '',
                dateOfBirth: document.getElementById('dateOfBirth')?.value || '',
                bloodGroup: document.getElementById('bloodGroup')?.value || '',
                emergencyContactName: document.getElementById('emergencyContactName')?.value || '',
                emergencyContactNumber: document.getElementById('emergencyContactNumber')?.value || '',
                emergencyContactRelation: document.getElementById('emergencyContactRelation')?.value || ''
            },
            employeeDetails: {
                employeeId: document.getElementById('employeeId')?.value || '',
                dateOfJoining: document.getElementById('dateOfJoining')?.value || '',
                personalEmail: document.getElementById('personalEmail')?.value || '',
                companyEmail: document.getElementById('companyEmail')?.value || ''
            },
            address: {
                currentAddress: document.getElementById('currentAddress')?.value || '',
                permanentAddress: document.getElementById('permanentAddress')?.value || '',
                personalEmail: document.getElementById('personalEmail')?.value || '',
                companyEmail: document.getElementById('companyEmail')?.value || '',
                country: document.getElementById('country')?.value || '',
                state: document.getElementById('state')?.value || '',
                district: document.getElementById('district')?.value || '',
                city: document.getElementById('city')?.value || '',
                pincode: document.getElementById('pincode')?.value || ''
            },
            identification: {
                aadharNumber: document.getElementById('aadharNumber')?.value || '',
                uanNumber: document.getElementById('uanNumber')?.value || '',
                panNumber: document.getElementById('panNumber')?.value || '',
                passportNumber: document.getElementById('passportNumber')?.value || '',
                passportValidUpto: document.getElementById('passportValidUpto')?.value || ''
            },
            bank: {
                bankName: (() => {
                    const bankNameValue = document.getElementById('bankName')?.value || '';
                    if (bankNameValue === 'Other') {
                        return document.getElementById('bankNameOther')?.value?.trim() || '';
                    }
                    return bankNameValue;
                })(),
                accountNumber: document.getElementById('accountNumber')?.value || '',
                ifscCode: document.getElementById('ifscCode')?.value || '',
                bankHolderName: document.getElementById('bankHolderName')?.value || ''
            },
            education: this.collectEducationData(),
            experience: this.collectExperienceData(),
            other: {
                highestQualification: document.getElementById('highestQualification')?.value || '',
                highestQualificationPassingYear: document.getElementById('highestQualificationYear')?.value || '',
                detailsConfirmation: document.getElementById('detailsConfirmation')?.checked || false
            }
        };
    }

    collectEducationData() {
        const educationData = [];
        const entries = document.querySelectorAll('.education-entry');

        entries.forEach((entry) => {
            const educationEntry = {
                level: entry.querySelector('.education-level')?.value || '',
                qualification: entry.querySelector('.qualification')?.value || '',
                yearOfPassing: entry.querySelector('.year-of-passing')?.value || '',
                specialization: entry.querySelector('.specialization')?.value || '',
                boardUniversity: entry.querySelector('.board-university')?.value || '',
                cgpa: entry.querySelector('.cgpa')?.value || ''
            };

            const hasAnyEducationValue = Object.values(educationEntry).some(
                (value) => String(value).trim() !== ''
            );

            if (hasAnyEducationValue) {
                educationData.push(educationEntry);
            }
        });

        return educationData;
    }

    collectExperienceData() {
        const experienceData = [];
        const hasExperienceYes = document.getElementById('hasExperienceYes');
        if (!hasExperienceYes || !hasExperienceYes.checked) {
            return experienceData;
        }

        const entries = document.querySelectorAll('.experience-entry');

        entries.forEach((entry) => {
            const experienceEntry = {
                organization: entry.querySelector('.organization')?.value || '',
                designation: entry.querySelector('.designation')?.value || '',
                experienceAddress: entry.querySelector('.experience-address')?.value || '',
                companyContact: entry.querySelector('.company-contact')?.value || '',
                fromDate: entry.querySelector('.from-date')?.value || '',
                toDate: entry.querySelector('.to-date')?.value || '',
                ctc: entry.querySelector('.ctc')?.value || '',
                reasonForLeaving: entry.querySelector('.reason-for-leaving')?.value || ''
            };

            const hasAnyExperienceValue = Object.values(experienceEntry).some(
                (value) => String(value).trim() !== ''
            );

            if (hasAnyExperienceValue) {
                experienceData.push(experienceEntry);
            }
        });

        return experienceData;
    }

    async submitToAPI() {
        const detailsConfirmationCheckbox = document.getElementById('detailsConfirmation');
        if (!detailsConfirmationCheckbox || !detailsConfirmationCheckbox.checked) {
            this.showNotification('Please confirm the declaration before submitting', 'error');
            return;
        }

        const employeeIdAllowed = await this.validateEmployeeIdAvailability({
            showNotification: true,
            markField: true
        });
        if (!employeeIdAllowed) return;

        const formData = this.collectFormData();

        // Show loading
        this.showNotification('Submitting your application...', 'info');

        try {
            // Same-origin API endpoint served by Express backend
            const apiEndpoint = '/api/onboarding/submit';

            // Prepare data for submission
            const submitData = {
                data: formData,
                files: this.getTotalFileCount()
            };

            console.log('Submitting data:', submitData);

            // Submit to API
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData)
            });

            if (response.ok) {
                this.showNotification('Application submitted successfully!', 'success');

                // Close modal
                const modalElement = document.getElementById('summaryModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    }
                }

                // Replace form UI with a dedicated success screen
                this.showSubmissionSuccessScreen();

            } else {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.message || 'Submission failed');
            }

        } catch (error) {
            console.error('API Error:', error);
            this.showNotification(`Failed to submit application. ${error.message}`, 'error');
        }
    }

    async validateEmployeeIdAvailability({ showNotification = false, markField = false } = {}) {
        const employeeIdInput = document.getElementById('employeeId');
        const employeeId = employeeIdInput?.value?.trim() || '';
        if (!employeeId) return true;
        if (this.employeeIdCheckInFlight) return true;

        this.employeeIdCheckInFlight = true;
        try {
            const response = await fetch(`/api/onboarding/validate-employee-id?employeeId=${encodeURIComponent(employeeId)}`);
            const data = await response.json().catch(() => ({}));

            const allowed = Boolean(data.allowed);
            const blockedMessage = data.message || 'This employee ID has already verified and cannot apply again.';

            if (!allowed) {
                if (markField && employeeIdInput) {
                    employeeIdInput.classList.add('is-invalid');
                    this.showFieldError(employeeIdInput, blockedMessage);
                }
                if (showNotification) {
                    this.showNotification(blockedMessage, 'error');
                }
                return false;
            }

            if (employeeIdInput) {
                employeeIdInput.classList.remove('is-invalid');
                this.removeFieldError(employeeIdInput);
            }
            return true;
        } catch (_error) {
            if (showNotification) {
                this.showNotification('Unable to validate Employee ID right now. Please try again.', 'error');
            }
            return false;
        } finally {
            this.employeeIdCheckInFlight = false;
        }
    }

    showSubmissionSuccessScreen() {
        const appContainer = document.querySelector('.container.py-4');
        if (!appContainer) return;
        document.body.classList.add('success-screen-active');
        appContainer.classList.remove('py-4');
        appContainer.classList.add('submission-success-container');

        appContainer.innerHTML = `
            <div class="submission-success-screen">
                <div class="submission-success-card">
                    <img src="./logo.png" alt="Polosoft Logo" class="submission-success-logo" onerror="this.style.display='none'" />
                    <div class="submission-success-icon">
                        <svg class="submission-success-check-svg" viewBox="0 0 52 52" aria-hidden="true">
                            <path class="submission-success-check-path" d="M14 27 L23 36 L38 18"></path>
                        </svg>
                    </div>
                    <h2>Thank you!</h2>
                    <p>Your submission has been sent.</p>
                    <p>Please reach out to our HR team for further verification process.</p>
                </div>
            </div>
        `;
    }

    getTotalFileCount() {
        let count = this.uploadedFiles.aadhar.length;
        if (this.uploadedFiles.pan) count++;

        Object.values(this.uploadedFiles.education).forEach(edu => {
            if (edu.certificate) count++;
        });

        Object.values(this.uploadedFiles.experience).forEach(exp => {
            if (exp.appointment) count++;
            if (exp.experience) count++;
            if (exp.relieving) count++;
        });

        return count;
    }

    resetForm() {
        const form = document.getElementById('onboardingForm');
        if (form) {
            form.reset();
        }

        this.currentSection = 1;
        this.educationCount = 1;
        this.experienceCount = 0;
        this.uploadedFiles = {
            aadhar: [],
            pan: null,
            education: {},
            experience: {}
        };

        // Reset UI
        document.querySelectorAll('.form-section').forEach((section, index) => {
            section.style.display = index === 0 ? 'block' : 'none';
        });

        // Clear education container except first entry
        const educationContainer = document.getElementById('educationContainer');
        if (educationContainer) {
            const firstEntry = educationContainer.querySelector('.education-entry');
            educationContainer.innerHTML = '';
            if (firstEntry) {
                educationContainer.appendChild(firstEntry.cloneNode(true));
            }
        }

        // Clear experience container
        const experienceContainer = document.getElementById('experienceContainer');
        if (experienceContainer) {
            experienceContainer.innerHTML = '';
        }

        const addExperienceBtn = document.getElementById('addExperienceBtn');
        if (addExperienceBtn) {
            addExperienceBtn.style.display = 'none';
        }

        const removeExperienceBtn = document.getElementById('removeExperienceBtn');
        if (removeExperienceBtn) {
            removeExperienceBtn.style.display = 'none';
        }




        // Clear file lists
        const aadharFilesList = document.getElementById('aadharFilesList');
        if (aadharFilesList) {
            aadharFilesList.innerHTML = '';
        }

        const panUploadBox = document.getElementById('panUploadBox');
        if (panUploadBox) {
            panUploadBox.innerHTML = `
                    <i class="fa-solid fa-cloud-arrow-up upload-icon mb-2"></i>
                    <label class="upload-text">Upload PAN Card</label>
                `;
        }

        this.updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showNotification(message, type = 'info') {
        // Create custom notification without Toastify
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                min-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
                display: flex;
                align-items: center;
            `;

        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#dc3545',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        notification.style.background = colors[type] || colors.info;

        // Add icon
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
                <i class="fas ${icons[type] || icons.info} me-2"></i>
                <span>${message}</span>
                <button class="btn-close btn-close-white ms-auto" style="background:transparent; border:none; color:white; font-size:12px;"></button>
            `;

        document.body.appendChild(notification);

        // Add close button event
        const closeBtn = notification.querySelector('.btn-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);

        // Add CSS animations
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
            document.head.appendChild(style);
        }
    }
}

// Initialize the form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.onboardingForm = new OnboardingForm();

    console.log('Form initialized and ready');
});
