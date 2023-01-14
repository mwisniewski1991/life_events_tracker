<script>

import ActionsCategoryBox from "./ActionsCategoryBox.svelte";
let promise = get_actions_list();

async function get_actions_list(){

    const response = await fetch('/actions_list');

    if (response.ok){
        return response.json();
    }else{
        throw new Error('Error with comunication.');
    };
} 

</script>

<div class="actionContainer"> 

    {#await promise then categories_list}
        {#each categories_list as {idd, name, actions_list} }
            <ActionsCategoryBox category_name={name} actions_list={actions_list}/>
        {/each}
    {/await}
  
</div>

<style>
    .actionContainer{
    }
</style>