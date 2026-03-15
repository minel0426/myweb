<template>
    <div class="layout">
        <header>
            <h1>secret</h1>
            <nav>
                <RouterLink to="/">Home</RouterLink>
            </nav>
        </header>
    
        <main>
            <slot></slot>
        </main>
    
        <footer>
            <!-- <p>© 2026 secret</p> -->
        </footer>
    </div>
</template>

<style scoped>
.layout {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: sans-serif;
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    /* border-bottom: 1px solid #eee; */
    padding-bottom: 20px;
    margin-bottom: 20px;
}

nav a {
    text-decoration: none;
    color: #333;
}

footer {
    margin-top: 50px;
    text-align: center;
    color: #999;
    font-size: 0.9em;
}
</style>