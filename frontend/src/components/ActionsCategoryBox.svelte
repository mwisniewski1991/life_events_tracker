<script>
    import ActionBox from "./ActionBox.svelte";
    import { year, month, day } from "./store.js"
    
    export let category_name;
    export let actions_list;


</script>

<div class="container actionsCategoryBox">
    <div class='row'>
        <h3 class='display-5'>{category_name}</h3>
    </div>
    <div class=row>
        {#each actions_list as {action_idd, action_name, posted_today}}
            <ActionBox 
                action_idd={action_idd} 
                action_name={action_name} 
                posted_today={posted_today}
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
        width: 100%;
        border-bottom: .5px dashed white;

    }

</style>