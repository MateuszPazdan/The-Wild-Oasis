'use server';

import { revalidatePath } from 'next/cache';
import { auth, signIn, signOut } from './auth';
import { supabase } from './supabase';
import { getBookings } from './data-service';
import { redirect } from 'next/navigation';

export async function updateProfile(formData) {
	const session = await auth();
	if (!session) throw new Error('You must be logged in');
	const nationalID = formData.get('nationalID');
	const [nationality, countryFlag] = formData.get('nationality').split('%');
	if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID))
		throw new Error('Please provide a valid national ID');

	const updatedData = { nationality, countryFlag, nationalID };

	const { data, error } = await supabase
		.from('guests')
		.update(updatedData)
		.eq('id', session.user.guestId);

	if (error) throw new Error('Guest could not be updated');
	revalidatePath('/account');
}

export async function deleteReservation(bookingId) {
	const session = await auth();
	if (!session) throw new Error('You must be logged in');
	const guestBookings = await getBookings(session.user.guestId);
	const guestBookingsIds = guestBookings.map((booking) => booking.id);
	if (!guestBookingsIds.includes(bookingId))
		throw new Error('You are not allowed to delete this booking');

	const { error } = await supabase
		.from('bookings')
		.delete()
		.eq('id', bookingId);

	revalidatePath('/account/reservations');
	if (error) throw new Error('Booking could not be deleted');
}

export async function updateBooking(formData) {
	const session = await auth();
	if (!session) throw new Error('You must be logged in');
	const guestBookings = await getBookings(session.user.guestId);
	const guestBookingsIds = guestBookings.map((booking) => booking.id);

	const bookingId = Number(formData.get('bookingId'));
	if (!guestBookingsIds.includes(bookingId))
		throw new Error('You are not allowed to update this booking');

	const updatedData = {
		numGuests: Number(formData.get('numGuests')),
		observations: formData.get('observations').slice(0, 1000),
	};

	const { error } = await supabase
		.from('bookings')
		.update(updatedData)
		.eq('id', bookingId)
		.select()
		.single();

	if (error) {
		throw new Error('Booking could not be updated');
	}
	revalidatePath('/account/reservations');
	revalidatePath(`/account/reservations/edit/${bookingId}`);
	redirect('/account/reservations');
}

export async function signInAction() {
	await signIn('google', { redirectTo: '/account' });
}

export async function signOutAction() {
	await signOut({ redirectTo: '/' });
}
