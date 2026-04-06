<template>
    <div id="app">
        <header>
            <h1>Welcome to Patchwork</h1>
        </header>
        <main>
            <p>This is a basic frontend following HTML structure examples.</p>
        </main>
        <footer>
            <p>&copy; 2023 Patchwork</p>
        </footer>
    </div>
</template>

<script>
export default {
    name: 'App'
}
</script>

<style scoped>
#app {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

header {
    background-color: #f0f0f0;
    padding: 10px;
    text-align: center;
}

main {
    padding: 20px;
}

footer {
    background-color: #f0f0f0;
    padding: 10px;
    text-align: center;
    margin-top: 20px;
}
</style>