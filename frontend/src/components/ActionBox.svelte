<script>
    import { year, month, day } from "./store.js"
    export let action_name;
    export let action_idd;
    export let posted_today;
    let action_status = ''
    let remove_button_disabled = true;
    let last_event_idd = null;


    function check_posting(posted_today){
        if (posted_today){
            action_status = 'POSTED TODAY';
        }else{
            action_status = ''
        }
    }
    check_posting(posted_today);

    async function post_event(action_idd){

        const response = await fetch(`/event-post?action-idd=${action_idd}`, {
            method: 'POST',
        })

        if(response.ok){
            const respond = await response.json()

            if (respond['actions_events_existed'] == true){
                action_status = '- action already posted today';
            };
            if(respond['posted'] == true){
                action_status = 'POSTED';
                remove_button_disabled = false;
                last_event_idd = respond['events_idd']
            };
            
        }else{
            action_status = 'error during posting';
        }

    }

    async function delete_event(event_idd){
        if(last_event_idd != null){
            const response = await fetch(`/event-delete?event-idd=${event_idd}`, {
                method: 'POST',
            })
            if (response.ok){
                action_status = 'REMOVED';
                remove_button_disabled = true;
            }
        };
    }

</script>

<div class="card">
    <div class="card-body">
        <div class="card-button-container">
                <h5 class="card-title">{action_name} </h5>
                
                <span class='card-status'>Status: {action_status}</span>

                {#if posted_today}
                    <button type="button" class="btn btn-outline-secondary" disabled>Add action</button>
                {:else}
                    <button type="button" class="btn btn-outline-success" on:click={post_event(action_idd)}>Add action</button>
                {/if}


                {#if remove_button_disabled }
                    <button type="button" class="btn btn-outline-secondary btn-remove" disabled> Remove last event</button>
                {:else}
                    <button type="button" class="btn btn-outline-warning btn-remove" on:click={delete_event(last_event_idd)}>Remove last event</button>
                {/if}

        </div>
    </div>
</div>

<style>
    .card{
        background-color: #0c0c0d;
        color: white;
    }
    .card-title{
        text-align: center;
        padding-bottom: 5px;
    }
    .card-status{
        text-align: center;
        padding-bottom: 5px;
    }
    .btn{
        width: 200px;
        margin: auto;
        margin-bottom: 10px;
    }
    .btn-outline-success{
        width: 200px;
    }   
    .btn-remove{
        width: 200px;
    }
    .card-button-container{
        display: flex;
        flex-direction: column;
    }
</style>


