<script>
	import Header from "./components/Header.svelte";
	import ActionsContainers from "./components/ActionsContainers.svelte";
</script>

<header>
	<Header/>
</header>
<main>
	<ActionsContainers/>
</main>

<style>
	:global(body){
		background-color: #0c0c0d;
	}
	main {
		background-color: #0c0c0d;
		text-align: left;
		/* max-width: 240px; */
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>