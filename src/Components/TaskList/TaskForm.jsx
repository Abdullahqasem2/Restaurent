import React, { useState, useEffect } from 'react';
import { Container, Typography, TextField, Button, Grid } from '@mui/material';
import dayjs from 'dayjs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import AddressNav from './AddressNav';
import { useNavigate } from 'react-router-dom';

// Constants
const SHOP_ADDRESS = { id: 8, name: "BBQ Pizza", lat: 31.918774331362282, lng: 35.17747003175636 };
const API_BASE_URL = "http://localhost:8000";
const TASK_API_URL = "/api/add_task?user_api_hash=$2y$10$F4RpJGDpBDWO2ie448fQAu2Zo0twdwyBdMmnbeSqFbEkjGYocP.Y6";

// Utility functions
const generateUniqueId = () => `INV-${uuidv4()}`;

const fetchClosestDriver = async (shopAddress) => {
    if (!shopAddress || !shopAddress.lat || !shopAddress.lng) {
        console.error("Invalid shop address");
        return null;
    }
    try {
        const response = await axios.get(`${API_BASE_URL}/closest-driver`, {
            params: { lat: shopAddress.lat, lng: shopAddress.lng }
        });
        return response.data.driver.id;
    } catch (error) {
        console.error("Error fetching closest driver:", error);
        return null;
    }
};

const TaskForm = () => {
    const [devices, setDevices] = useState([]);
    const [device, setDevice] = useState('');
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('3');
    const [startDateTime, setStartDateTime] = useState(dayjs());
    const [endDateTime, setEndDateTime] = useState(dayjs());
    const [deliveryStartDateTime, setDeliveryStartDateTime] = useState(dayjs());
    const [deliveryEndDateTime, setDeliveryEndDateTime] = useState(dayjs());
    const [homeAddress, setHomeAddress] = useState({});
    const [invoiceNumber, setInvoiceNumber] = useState(generateUniqueId());
    const [form, setForm] = useState({
        id: 2,
        device_id: 1,
        user_id: 1,
        title: '',
        comment: 'بلا تفاصيل ',
        priority: 3,
        status: 1,
        invoice_number: generateUniqueId(),
        pickup_address: ' Palestinian Territory',
        pickup_address_lat: 31.9209736,
        pickup_address_lng: 35.1762547,
        pickup_time_from: '2024-06-20 08:00:00',
        pickup_time_to: '2024-06-20 12:00:00',
        delivery_address: 'Palestinian Territory',
        delivery_address_lat: 31.90597075,
        delivery_address_lng: 35.2002109028187,
        delivery_time_from: '2024-06-20 12:00:00',
        delivery_time_to: '2024-06-20 17:00:00',
        created_at: '2024-06-20 20:06:24',
        updated_at: '2024-06-26 12:30:23'
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prevForm) => ({ ...prevForm, [name]: value }));
    };

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const updatedForm = { ...form, device_id: device };
        try {
            const response = await axios.post(TASK_API_URL, updatedForm, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cookie': 'laravel_session=eyJpdiI6ImRIMzFLbDM5aXZ1amdtS0lZTnZvU0E9PSIsInZhbHVlIjoiNHVrZWpTMkN0ZG4zbGU1QkRIUTFEd3ZnQlhSVmpXS3JCMmVWSnJEYmR1Tng5YUF6V0NQVWg5TkJcL256Q3h1RGRGanhKT2V4VUNMem1wZnR0b0NCbWV3dEN2NWZkSW5YRnI5Z1JPcmpuSGhoam56N0VidVpzODkxOW9waDhnRWVFIiwibWFjIjoiZDRmN2ZkYzk4M2YwZGRkNWY4MWY1NWQ3OTVkOTVmZmQ2ZjU0MGJlZmRmZWViMDY1MDNlYjYzZDRhMDlhYmM1NyJ9'
                }
            });
            console.log('Task added successfully:', response.data);
            navigate('/settings');
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    const handleAddressSelect = (selectedAddress) => {
        setHomeAddress(selectedAddress);
        setForm((prevForm) => ({
            ...prevForm,
            delivery_address: selectedAddress.value,
            delivery_address_lat: selectedAddress.lat || '',
            delivery_address_lng: selectedAddress.lng || ''
        }));
    };

    useEffect(() => {
        const fetchData = async () => {
            const closestDriver = await fetchClosestDriver(SHOP_ADDRESS);
            if (closestDriver) {
                setDevice(closestDriver);
            }
        };

        fetchData();
    }, []);

    return (
        <Container maxWidth="md" sx={{ bgcolor: 'gray', color: 'white', padding: 3, borderRadius: 2 }}>
            <Typography sx={{ direction: 'rtl' }} variant="h6" gutterBottom>
                مهمة جديدة
            </Typography>
            <Typography sx={{ color: 'white', display: 'flex', justifyContent: 'center', mb: '20px' }}>اختار عنوان التسليم</Typography>
            <AddressNav onAddressSelect={handleAddressSelect} />
            <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            label="رقم الفاتورة"
                            name="invoice_number"
                            value={form.invoice_number}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="normal"
                            sx={{ bgcolor: 'white' }}
                            disabled
                        />
                    </Grid>
                    <Grid item xs={12} sm={9}>
                        <TextField
                            label="تفاصيل العنوان"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="normal"
                            sx={{ bgcolor: 'white' }}
                            required
                        />
                    </Grid>
                    <Grid item xs={20} sm={15}>
                        <TextField
                            label="تفاصيل الطلبية"
                            name="comment"
                            value={form.comment}
                            onChange={handleChange}
                            fullWidth
                            variant="outlined"
                            margin="normal"
                            sx={{ bgcolor: 'white' }}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ textAlign: 'center' }}>
                        <Button sx={{ height: '10vh', width: '100%' }} variant="contained" color="success" type="submit">
                            إرسال
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Container>
    );
};

export default TaskForm;
