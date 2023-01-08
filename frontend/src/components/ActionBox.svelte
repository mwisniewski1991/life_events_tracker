<script>
    export let action_name;
    export let action_id;
    let action_status = ''

    async function post_action(action_idd){

        const response = await fetch(`/action_post?action_idd=${action_idd}`, {
            method: 'POST',
        })

        if(response.ok){
            const respond = await response.json()

            if (respond['actions_events_existed'] == true){
                action_status = '- action already posted today';
                console.log(respond);

            };
            if(respond['posted'] == true){
                action_status = '- POSTED';
                console.log(respond);
            };
            
        }else{
            action_status = 'error during posting';

        }

    }


</script>

<div class="card">
    <div class="cakrd-body">
            <h5 class="card-title">{action_name} {action_status}</h5>
        <button type="button" class="btn btn-outline-success" on:click={post_action(action_id)}>Add action</button>
    </div>
</div>

<style>
    .card{
        background-color: #0c0c0d;
        color: white;
    }
    .btn{
        width: 200px;
    }
</style>


