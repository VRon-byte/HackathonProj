  let auth0Client = null;

  // Configure Auth0 with your specific credentials
  const auth0Config = {
    domain: "YOUR_AUTH0_DOMAIN",     // Replace with your real Domain
    clientId: "YOUR_CLIENT_ID",     // Replace with your real Client ID
    authorizationParams: {
      redirect_uri: window.location.origin
    }
  };

  // Initialize when the page loads
  window.onload = async () => {
    try {
      auth0Client = await auth0.createAuth0Client(auth0Config);

      // Handle return from login redirect
      const query = window.location.search;
      if (query.includes("code=") && query.includes("state.")) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      await updateUI();
    } catch (error) {
      console.error("Auth0 failed to load:", error);
    }
  };

  // Update what the user sees
  async function updateUI() {
    const isAuthenticated = await auth0Client.isAuthenticated();
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");

    if (isAuthenticated) {
      if(loginBtn) loginBtn.style.display = "none";
      if(logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
      if(loginBtn) loginBtn.style.display = "inline-block";
      if(logoutBtn) logoutBtn.style.display = "none";
    }
  }

  // Action functions triggered by your HTML button clicks
  async function login() {
    await auth0Client.loginWithRedirect();
  }

  function logout() {
    auth0Client.logout({
      logoutParams: { returnTo: window.location.origin }
    });
  }
