<script>
	import { onMount } from 'svelte';
    import { year, month, day } from "./store.js"

    let year_number;
    let month_number;
    let day_number;

    let month_string;
    let day_string;

    year.subscribe((value) => year_number = value)

    month.subscribe((value) => {
        month_number = value
        if (value < 10 ){
            month_string = '0' + (value + 1)
        }else{
            month_string = '' + (value + 1)
        }
    });
    day.subscribe((value) => {
        day_number = value
        if (value < 10 ){
            day_string = '0' + value
        }else{
            day_string = '' + value
        }
    });

    function increment_date(){
        let new_date = new Date(year_number, month_number, day_number);
        new_date.setDate(new_date.getDate() + 1)

        year.set(new_date.getFullYear())
        month.set(new_date.getMonth())
        day.set(new_date.getDate())
    }

    function deacrement_date(){
        let new_date = new Date(year_number, month_number, day_number);
        new_date.setDate(new_date.getDate() - 1)

        year.set(new_date.getFullYear())
        month.set(new_date.getMonth())
        day.set(new_date.getDate())
    }


</script>

<div class="actionsDate container" >
    <button type="button" class="btn btn-secondary" on:click={deacrement_date}>-1</button>
    <span class="dateString">{year_number}-{month_string}-{day_string}</span>
    <button type="button" class="btn btn-secondary" on:click={increment_date}>+1</button>
</div>

<style>
    .actionsDate{
        width: 100%;
        margin: auto;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .dateString{
        color: white;
        font-size: 1em;
        margin: 0px 50px;
    }
</style>