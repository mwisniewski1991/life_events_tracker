<script>

const category_list = [
    {id:'work', name: 'Work', action_list: [
        { action_id: 'office', action_name:'Office', posted_today: true},
        { action_id: 'home', action_name:'Home office', posted_today: false},
    ]},
    {id:'social', name: 'Social', action_list: [
        { action_id: 'visit', action_name:'Made visit', posted_today: false},
        { action_id: 'vistors', action_name:'Have visitors', posted_today: false},
    ]},
    {id:'dinner', name: 'Dinner', action_list: [
        { action_id: 'homemade', action_name:'Homemade', posted_today: false},
        { action_id: 'ordered', action_name:'Ordered', posted_today: false},
        { action_id: 'restaurant', action_name:'Restaurant', posted_today: false},
    ]},
    {id:'drinks', name: 'Drinks', action_list: [
        { action_id: 'tea', action_name:'Tea', posted_today: false},
        { action_id: 'coffee', action_name:'Coffee', posted_today: false},
        { action_id: 'alcohol', action_name:'Alcohol', posted_today: false},
    ]},
    {id:'health_fitness', name: 'Health and Fitness', action_list: [
        { action_id: 'bike', action_name:'Bike', posted_today: false},
        { action_id: 'gym', action_name:'Gym', posted_today: false},
        { action_id: 'home_exercises', action_name:'Home exercises', posted_today: false},
        { action_id: 'hike', action_name:'Hike', posted_today: false},
        { action_id: 'doctors', action_name:'Doctors', posted_today: false},
    ]},
    {id:'bathroom', name: 'Bath', action_list: [
        { action_id: 'shower', action_name:'Shower', posted_today: false},
        { action_id: 'bath', action_name:'Bath', posted_today: false},
        { action_id: 'poop', action_name:'Poop', posted_today: false},
    ]},
    {id:'mw_dev', name: 'MW Developer', action_list: [
        { action_id: 'python', action_name:'Python', posted_today: false},
        { action_id: 'javascript', action_name:'Javascript', posted_today: false},
        { action_id: 'react', action_name:'React', posted_today: false},
        { action_id: 'iot', action_name:'Internet of Things', posted_today: false},
    ]},
]

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