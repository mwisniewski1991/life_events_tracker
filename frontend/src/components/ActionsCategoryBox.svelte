<script>
    export let category_name;
    export let actions_list;
    import ActionBox from "./ActionBox.svelte";


</script>

<div class="container m-3 actionsCategoryBox">

    <div class='row'>
        <h3 class='display-5'>{category_name}</h3>
    </div>

    <div class=row>
        {#each actions_list as {action_idd, action_name}}
            <ActionBox 
                action_id={action_idd} 
                action_name={action_name} 
            />
        {/each}
    </div>

</div>


<style>
    .display-5{
        color: #ff3e00;
        /* font-size: 1em; */
    } 
    .actionsCategoryBox{
        border-bottom: .5px dashed white;
    }

</style>