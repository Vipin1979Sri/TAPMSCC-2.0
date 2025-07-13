document.addEventListener('DOMContentLoaded', () => {
    const planSelect = document.getElementById('planSelect');
    const ageSelect = document.getElementById('ageSelect');
    const durationSelect = document.getElementById('durationSelect');
    const premiumForm = document.getElementById('premiumForm');
    const resultsDiv = document.getElementById('results');
    const docViewer = document.getElementById('doc-viewer');

    let plansData = [];

    // Fetch plans data
    fetch('data/plans.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            plansData = data;
            populatePlanSelect(plansData);
        })
        .catch(error => {
            console.error('Error fetching plans:', error);
            resultsDiv.innerHTML = '<p class="error-message">Failed to load plans data. Please try again later.</p>';
        });

    function populatePlanSelect(plans) {
        planSelect.innerHTML = '<option value="">Select Plan</option>';
        const uniquePlanNames = [...new Set(plans.map(plan => plan.plan))];
        uniquePlanNames.forEach(planName => {
            const option = document.createElement('option');
            option.value = planName;
            option.textContent = planName;
            planSelect.appendChild(option);
        });
        resetAgeAndDurationSelects();
    }

    function resetAgeAndDurationSelects() {
        ageSelect.innerHTML = '<option value="">Select Age</option>';
        durationSelect.innerHTML = '<option value="">Select Duration</option>';
        ageSelect.disabled = true;
        durationSelect.disabled = true;
        resultsDiv.innerHTML = '';
        docViewer.style.display = 'none';
    }

    planSelect.addEventListener('change', () => {
        const selectedPlanName = planSelect.value;
        if (selectedPlanName === "") {
            resetAgeAndDurationSelects();
            return;
        }

        const plansWithSelectedName = plansData.filter(p => p.plan === selectedPlanName);
        const uniqueAgeRanges = [...new Set(plansWithSelectedName.flatMap(p => p.age))];
        populateAgeSelect(uniqueAgeRanges);
        ageSelect.disabled = false;
        durationSelect.innerHTML = '<option value="">Select Duration</option>';
        durationSelect.disabled = true;
        resultsDiv.innerHTML = '';
        docViewer.style.display = 'none';
    });

    function populateAgeSelect(ages) {
        ageSelect.innerHTML = '<option value="">Select Age</option>';
        ages.forEach(age => {
            const option = document.createElement('option');
            option.value = age;
            option.textContent = age;
            ageSelect.appendChild(option);
        });
    }

    ageSelect.addEventListener('change', () => {
        const selectedPlanName = planSelect.value;
        const selectedAgeRange = ageSelect.value;

        if (selectedAgeRange === "") {
            durationSelect.innerHTML = '<option value="">Select Duration</option>';
            durationSelect.disabled = true;
            resultsDiv.innerHTML = '';
            docViewer.style.display = 'none';
            return;
        }

        const plansMatchingAge = plansData.filter(p => p.plan === selectedPlanName && p.age.includes(selectedAgeRange));
        const uniqueDurationRanges = [...new Set(plansMatchingAge.flatMap(p => p.duration))];
        populateDurationSelect(uniqueDurationRanges);
        durationSelect.disabled = false;
        resultsDiv.innerHTML = '';
        docViewer.style.display = 'none';
    });

    function populateDurationSelect(durations) {
        durationSelect.innerHTML = '<option value="">Select Duration</option>';
        durations.forEach(duration => {
            const option = document.createElement('option');
            option.value = duration;
            option.textContent = duration;
            durationSelect.appendChild(option);
        });
    }

    premiumForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedPlanName = planSelect.value;
        const selectedAgeRange = ageSelect.value;
        const selectedDurationRange = durationSelect.value;

        if (selectedPlanName === "" || selectedAgeRange === "" || selectedDurationRange === "") {
            resultsDiv.innerHTML = '<p class="error-message">Please select a plan, age, and duration.</p>';
            docViewer.style.display = 'none';
            return;
        }

        const matchingPlans = plansData.filter(p =>
            p.plan === selectedPlanName &&
            p.age.includes(selectedAgeRange) &&
            p.duration.includes(selectedDurationRange)
        );

        if (matchingPlans.length > 0) {
            let tableHtml = `
                <h3>${selectedPlanName}</h3>
                <p><strong>Age:</strong> ${selectedAgeRange} | <strong>Duration:</strong> ${selectedDurationRange}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Select</th>
                            <th>Coverage</th>
                            <th>Premium</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            matchingPlans.forEach((plan, index) => {
                let premiumValue = 'N/A';
                if (plan.premium && plan.premium[selectedAgeRange] && plan.premium[selectedAgeRange][selectedDurationRange]) {
                    premiumValue = plan.premium[selectedAgeRange][selectedDurationRange].toFixed(2);
                }
                tableHtml += `
                    <tr>
                        <td><input type="radio" name="selectedPlan" value="${index}"></td>
                        <td>${plan.coverage}</td>
                        <td>₹${premiumValue}</td>
                    </tr>
                `;
            });

            tableHtml += `
                    </tbody>
                </table>
            `;
            resultsDiv.innerHTML = tableHtml;

            // Add event listener for radio buttons to update docViewer
            const radioButtons = resultsDiv.querySelectorAll('input[name="selectedPlan"]');
            radioButtons.forEach(radio => {
                radio.addEventListener('change', (event) => {
                    // Remove highlight from previously selected row
                    const previouslySelectedRow = resultsDiv.querySelector('tr.selected-row');
                    if (previouslySelectedRow) {
                        previouslySelectedRow.classList.remove('selected-row');
                    }

                    // Add highlight to the newly selected row
                    const currentRow = event.target.closest('tr');
                    if (currentRow) {
                        currentRow.classList.add('selected-row');
                    }

                    const selectedIndex = event.target.value;
                    const selectedPlan = matchingPlans[selectedIndex];
                    if (selectedPlan && selectedPlan.doc) {
                        docViewer.innerHTML = `<img src="${selectedPlan.doc}" alt="Policy Document">`;
                        docViewer.style.display = 'block';
                    } else {
                        docViewer.style.display = 'none';
                    }

                    // Save selected premium to localStorage for MSC calculator
                    const premiumValueForMSC = selectedPlan.premium[selectedAgeRange][selectedDurationRange];
                    localStorage.setItem('selectedPremiumForMSC', premiumValueForMSC ? premiumValueForMSC.toFixed(0) : '0');
                });
            });

            // Optionally, pre-select the first radio button and display its document
            if (radioButtons.length > 0) {
                radioButtons[0].checked = true;
                const firstRow = radioButtons[0].closest('tr');
                if (firstRow) {
                    firstRow.classList.add('selected-row');
                }
                const selectedPlan = matchingPlans[0];
                if (selectedPlan && selectedPlan.doc) {
                    docViewer.innerHTML = `<img src="${selectedPlan.doc}" alt="Policy Document">`;
                    docViewer.style.display = 'block';
                } else {
                    docViewer.style.display = 'none';
                }
                // Save initial selected premium to localStorage for MSC calculator
                const premiumValueForMSC = selectedPlan.premium[selectedAgeRange][selectedDurationRange];
                localStorage.setItem('selectedPremiumForMSC', premiumValueForMSC ? premiumValueForMSC.toFixed(0) : '0');
            }

        } else {
            resultsDiv.innerHTML = '<p class="error-message">No matching plans found for the selected criteria.</p>';
            docViewer.style.display = 'none';
        }
    });

    // Add a clear form button
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear Form';
    clearButton.type = 'button';
    clearButton.classList.add('clear-button'); // Add a class for styling
    premiumForm.appendChild(clearButton);

    clearButton.addEventListener('click', () => {
        planSelect.value = "";
        resetAgeAndDurationSelects();
        resultsDiv.innerHTML = '';
        docViewer.style.display = 'none';
        localStorage.removeItem('selectedPremiumForMSC');
    });

    // Shared Functions (for footer buttons)
    window.getCanvas = function() {
        const shareableContent = document.getElementById('shareable-content');
        return html2canvas(shareableContent, { scale: 2 }); // Increase scale for better quality
    };

    window.shareViaEmail = function() {
        // Direct image attachment via mailto: is not reliably supported.
        // User can download the PNG and attach it manually.
        const subject = "Travel Armour Premium Calculation";
        const body = "Please find the premium calculation. (Image needs to be attached manually after downloading)";
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    window.shareViaWhatsApp = function() {
        // Direct image attachment via WhatsApp Web API is not supported with data URLs.
        // User can download the PNG and share it manually.
        const text = "Travel Armour Premium Calculation. (Image needs to be shared manually after downloading)";
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
    };

    window.downloadAsPNG = function() {
        getCanvas().then(canvas => {
            const link = document.createElement('a');
            link.download = 'travel-armour-calculator.png';
            link.href = canvas.toDataURL('image/png', 1.0); // Specify image type and quality
            link.click();
        });
    };
});