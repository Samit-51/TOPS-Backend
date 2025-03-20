const username = document.getElementById("username");
const password = document.getElementById("password");
const button = document.querySelector(".btn-login");

function submitData(e) {
    console.log('clicked');
    e.preventDefault();
    const enteredUsername = username.value;
    const enteredPassword = password.value;
    fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: enteredUsername, password: enteredPassword }),
    })
        .then(response => {
            if (!response.ok) {
                alert("Incorrect credentials");
                throw new Error("Login failed!"); 
            }
            return response.json(); 
        })
        .then(data => {
            if (data.redirect) {
                window.location.href = data.redirect;
            } else {
                console.log("Login failed:", data.message);
            }
        })
        .catch(error => console.error("Error:", error.message));

}

button.addEventListener("click", e => {
    submitData(e);
});