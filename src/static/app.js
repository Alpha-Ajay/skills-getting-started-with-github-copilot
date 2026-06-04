document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  // Utility: obfuscate email for display (keeps full email in data attributes)
  function obfuscateEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) return '*@' + domain;
    const visible = local[0] + '***' + local[local.length - 1];
    return `${visible}@${domain}`;
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (list with remove buttons or placeholder)
        const participantsHTML = details.participants && details.participants.length
          ? `
            <div class="participants">
              <h5>Participants</h5>
              <ul class="participants-list">
                ${details.participants.map(p => `
                  <li class="participant-item">
                    <span class="participant-email">${obfuscateEmail(p)}</span>
                    <button class="remove-participant" data-email="${p}" aria-label="Remove ${p}">✕</button>
                  </li>
                `).join("")}
              </ul>
            </div>
          `
          : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Attach event listeners for remove buttons
        activityCard.querySelectorAll('.remove-participant').forEach(btn => {
          btn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const email = btn.dataset.email;
            const obf = obfuscateEmail(email);
            if (!confirm(`Remove ${obf} from ${name}?`)) return;
            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`,
                { method: 'DELETE' }
              );

              const result = await response.json();

              if (response.ok) {
                // Remove the participant row
                const li = btn.closest('li');
                if (li) li.remove();

                // If no participants left, show placeholder
                const list = activityCard.querySelector('.participants-list');
                if (!list || list.children.length === 0) {
                  const participantsDiv = activityCard.querySelector('.participants');
                  if (participantsDiv) participantsDiv.innerHTML = '<p class="no-participants">No participants yet</p>';
                }

                // Update spots left
                const spotsElem = activityCard.querySelector('.spots-left');
                if (spotsElem) {
                  const current = parseInt(spotsElem.textContent, 10) || 0;
                  spotsElem.textContent = current + 1;
                }

                messageDiv.textContent = result.message;
                messageDiv.className = 'success';
              } else {
                messageDiv.textContent = result.detail || 'An error occurred';
                messageDiv.className = 'error';
              }

              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            } catch (error) {
              messageDiv.textContent = 'Failed to remove participant. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              console.error('Error removing participant:', error);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Update activity card UI so changes appear immediately
        try {
          const card = Array.from(document.querySelectorAll('.activity-card')).find(c => {
            const title = c.querySelector('h4');
            return title && title.textContent === activity;
          });

          if (card) {
            // Ensure participants container exists
            let participantsDiv = card.querySelector('.participants');
            if (!participantsDiv) {
              participantsDiv = document.createElement('div');
              participantsDiv.className = 'participants';
              participantsDiv.innerHTML = `\n                <h5>Participants</h5>\n                <ul class="participants-list"></ul>\n              `;
              card.appendChild(participantsDiv);
            }

            let list = participantsDiv.querySelector('.participants-list');
            if (!list) {
              list = document.createElement('ul');
              list.className = 'participants-list';
              participantsDiv.appendChild(list);
            }

            // Add new participant row
            const li = document.createElement('li');
            li.className = 'participant-item';
            const span = document.createElement('span');
            span.className = 'participant-email';
            span.textContent = obfuscateEmail(email);
            const btn = document.createElement('button');
            btn.className = 'remove-participant';
            btn.setAttribute('data-email', email);
            btn.setAttribute('aria-label', `Remove ${email}`);
            btn.textContent = '✕';
            li.appendChild(span);
            li.appendChild(btn);
            list.appendChild(li);

            // Attach remove handler to the new button
            btn.addEventListener('click', async (ev) => {
              ev.preventDefault();
              const emailToRemove = btn.dataset.email;
              const obf = obfuscateEmail(emailToRemove);
              if (!confirm(`Remove ${obf} from ${activity}?`)) return;
              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(emailToRemove)}`,
                  { method: 'DELETE' }
                );
                const resJson = await resp.json();
                if (resp.ok) {
                  const liEl = btn.closest('li'); if (liEl) liEl.remove();
                  const listEl = card.querySelector('.participants-list');
                  if (!listEl || listEl.children.length === 0) {
                    const pd = card.querySelector('.participants');
                    if (pd) pd.innerHTML = '<p class="no-participants">No participants yet</p>';
                  }
                  const spotsElem = card.querySelector('.spots-left');
                  if (spotsElem) {
                    const current = parseInt(spotsElem.textContent, 10) || 0;
                    spotsElem.textContent = current + 1;
                  }
                  messageDiv.textContent = resJson.message;
                  messageDiv.className = 'success';
                } else {
                  messageDiv.textContent = resJson.detail || 'An error occurred';
                  messageDiv.className = 'error';
                }
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              } catch (err) {
                messageDiv.textContent = 'Failed to remove participant. Please try again.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }
            });

            // Update spots left count
            const spotsElem = card.querySelector('.spots-left');
            if (spotsElem) {
              const current = parseInt(spotsElem.textContent, 10) || 0;
              spotsElem.textContent = Math.max(0, current - 1);
            }
          }
        } catch (err) {
          console.error('Error updating UI after signup:', err);
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
