/**
 * Event layer outer inator!!
 *
 * Will lay out events in the given column
 **/

import {differenceInMinutes, getDay, isBefore} from 'date-fns';
import className from 'classnames';
import React from "react";
import PropTypes from 'prop-types';
import {Resizable} from "../../../../resize/Resizable";
import {DEFAULT_END_HOUR, DEFAULT_NUM_DAYS, DEFAULT_START_HOUR} from "../../../../Constants";

const NUM_DAYS = 5;
const INTERVALS = 5;
const INTERVALS_PER_HOUR = 60 / INTERVALS;

export class EventLayerOuterInator extends React.PureComponent {

    /**
     * Returns the event column style inside a day
     *
     * e.g
     * Given E1, E2, E3, E4 we calculate such that the result is:
     *
     * E1 E2 E3
     * E1 E2
     * E1 E4 E4
     *
     * This method handles the internal styling of each event so the grid works out
     */
    getEventColumnStyle(event, eventColumnMap, columnIndex) {
        // start endIndex one more than column index because if
        // we start with column index, it will immediately conflict with itself
        // in its own column
        let endIndex = columnIndex + 1;
        for (; endIndex < eventColumnMap.length; endIndex++) {
            const eventsPerColumn = eventColumnMap[endIndex];

            // check if events in the next column are contained by our current column
            // if so, then we cannot extend our current event anymore so return early
            if (eventsPerColumn.some((e) => this.isContainedBy(e, event))) {
                return {
                    gridColumn: `${columnIndex + 1}/${endIndex}`
                };
            }
        }

        // event can extend all the way to the end because no events were contained by it
        return {
            gridColumn: `${columnIndex + 1}/${eventColumnMap.length + 1}`
        };
    }

    /**
     * Gets the styling for the events, including row style and column style
     */
    getEventStyle(event, eventColumnMap, columnIndex) {
        const eventStart = event.start;
        const eventEnd = event.end;
        const gridColPos = this.getEventColumnStyle(event, eventColumnMap, columnIndex);

        const startTime5MinuteIntervals = Math.floor((eventStart.getHours() - this.props.startHour) * INTERVALS_PER_HOUR)
            + Math.floor(eventStart.getMinutes() / INTERVALS) + 1;
        const endTime5MinuteIntervals = Math.floor((eventEnd.getHours() - this.props.startHour) * INTERVALS_PER_HOUR)
            + Math.floor(eventEnd.getMinutes() / INTERVALS) + 1;

        return {
            gridRow: `${startTime5MinuteIntervals}/${endTime5MinuteIntervals}`,
            ...gridColPos,
        };
    }

    /**
     * Returns whether evt1 is contained by evt2
     */
    isContainedBy(evt1, evt2) {
        return isBefore(evt2.start, evt1.start) && isBefore(evt1.end, evt2.end);
    }

    /**
     * Returns an array of lists where the indices represent the days and the lists are the events for that specific day
     */
    getEventsByDays() {
        const ret = new Array(NUM_DAYS);
        for (let event of this.props.events) {
            // arrays start at 0 so subtract 1 from it since Monday is 1 when I want it to be 0
            let day = getDay(event.start) - 1;
            if (!ret[day]) {
                ret[day] = [];
            }
            ret[day].push(event);
        }
        return ret;
    }

    /**
     * Takes an array of events per a day, for example all events for Monday and then arranges them such that
     * they would be most optimally shown in columns in the case that some of them may collide
     *
     * e.g.
     *
     * E1 E2
     *    E2
     *
     * Would return an array with two elements for the two columns, and each column would have a list of events
     * for them.
     *
     * @param events array of events per a day
     */
    layoutEventsIntoColumns(events) {
        // columns is a 2D array storing lists of events per column
        let columns = [];

        // for each event we will determine what column we should put it in
        for (let event of events) {
            let curColumn = null;

            // loop over the existing columns
            for (let column of columns) {
                if (column.length === 0) {
                    break;
                }

                // if the given event is not contained by any of the events in the column
                // then we can safely place down the event in that column
                let shouldPlaceInCol = column.every((eventPerColumn) => !this.isContainedBy(event, eventPerColumn));

                if (shouldPlaceInCol) {
                    curColumn = column;
                    break;
                }
            }

            if (curColumn) {
                curColumn.push(event);
            } else {
                columns.push([event]);
            }
        }
        return columns;
    }


    /**
     * Populates the event object with everything that the user might want to use
     * to render their component
     * @param evt
     * @returns {any}
     */
    hydrateEvent(evt) {
        return Object.assign({}, evt, {
            key: evt.start.toString() + evt.end.toString(),
            onEventDrag: this.props.onEventDrag.bind(this),
            onEventDrop: this.props.onEventDrop.bind(this),
            onEventDragStart: this.props.onEventDragStart.bind(this),
            onEventDragOver: this.props.onEventDragOver.bind(this),
            onEventResize: (e, position) => this.props.onEventResize(e, evt.id, position)
        });
    }

    /**
     * Returns divs for each events with the correct row/col start, row/end end
     */
    styleEventsInColumns(eventColumnMap) {
        const ret = [];

        for (let column = 0; column < eventColumnMap.length; column++) {
            const eventsPerColumn = eventColumnMap[column];

            for (let evt of eventsPerColumn) {
                const style = this.getEventStyle(evt, eventColumnMap, column);
                const classNames = className(this.props.eventClassName, "event-wrapper");

                // user will determine what kind of component to render based on the information given here
                const hydratedEvt = this.hydrateEvent(evt);
                const userComponent = this.props.getEvent(hydratedEvt);

                ret.push(
                    <div key={evt.id} style={style} className={classNames}>
                        <Resizable active={evt.active}
                                   id={evt.id}
                                   onResize={(e, position) => this.props.onEventResize(e, evt.id, position)}>
                            {userComponent}
                        </Resizable>
                    </div>
                );
            }
        }
        return ret;
    }

    getDayStyle(column) {
        const earliestHour = this.props.startHour;
        const latestHour = this.props.endHour;

        const diff = latestHour - earliestHour;
        const diffIn5MinuteIntervals = diff * INTERVALS_PER_HOUR;

        return {
            display: "grid",
            gridTemplateColumns: `repeat(${column}, ${100 / column}%)`,
            gridTemplateRows: `repeat(${diffIn5MinuteIntervals}, 1fr)`,
        };
    }

    /**
     * Sort events by duration - longest duration first
     */
    sortEvents(events) {
        return events.sort((e1, e2) => {
            let e1duration = differenceInMinutes(e1.start, e1.end);
            let e2duration = differenceInMinutes(e2.start, e2.end);

            return e1duration - e2duration;
        });
    }

    layoutEventsIntoDays() {
        const ret = [];
        let eventsByDay = this.getEventsByDays();

        let idx = 0;
        for (let eventsPerDay of eventsByDay) {
            idx++;
            if (eventsPerDay) {
                // maps for a specific day how many columns are needed to represent them with conflicts
                // so the first column has X events, the second has Y events and so on, and each
                // event should be rendered in its respective column within the certain day
                const sortedEvents = this.sortEvents(eventsPerDay);
                const eventColumnMap = this.layoutEventsIntoColumns(sortedEvents);
                let styledEvents = this.styleEventsInColumns(eventColumnMap);

                // put the styled events into one day column
                const styledDays = (
                    <div key={idx} style={this.getDayStyle(eventColumnMap.length)}>
                        {styledEvents}
                    </div>
                );

                ret.push(styledDays);
            } else {
                // no events push blank column
                ret.push(<div key={idx}/>);
            }
        }
        return ret;
    }

    render() {
        return (
            <React.Fragment>
                {this.layoutEventsIntoDays()}
            </React.Fragment>
        );
    }
}

EventLayerOuterInator.propTypes = {
    name: PropTypes.string.isRequired,
    eventClassName: PropTypes.string,
    getEvent: PropTypes.func,

    events: PropTypes.array.isRequired,
    startHour: PropTypes.number.isRequired,
    endHour: PropTypes.number.isRequired,
    numDays: PropTypes.number.isRequired,

    onEventDrag: PropTypes.func,
    onEventDrop: PropTypes.func,
    onEventResize: PropTypes.func,
    onEventDragStart: PropTypes.func,
    onEventDragOver: PropTypes.func,
};

EventLayerOuterInator.defaultProps = {
    name: "test",
    eventClassName: "",
    getEvent: () => {
    },

    events: [],
    startHour: DEFAULT_START_HOUR,
    endHour: DEFAULT_END_HOUR,
    numDays: DEFAULT_NUM_DAYS,

    onEventDrag: () => {},
    onEventDrop: () => {},
    onEventResize: () => {},
    onEventDragStart: () => {},
    onEventDragOver: () => {},
};
