import React from 'react';
import PropTypes from 'prop-types';
import { HourBar } from "../../bar/hour/HourBar";
import "./WeekCalendar.css";
import { EventCalendar } from "../event/EventCalendar";
import { DayBar } from "../../bar/day/DayBar";
const DEFAULT_MIN_HOUR = 8;
const DEFAULT_MAX_HOUR = 20;
const NUM_DAYS_IN_WEEK = 7;
const NUM_DAYS_IN_WORK_WEEK = 5;
export class WeekCalendar extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      numDays: props.workWeek ? NUM_DAYS_IN_WORK_WEEK : NUM_DAYS_IN_WEEK
    };
  }

  getMinHour() {
    if (!this.props.layers) return DEFAULT_MIN_HOUR;
    let startHours = [].concat(...this.props.layers.map(e => e.events)).map(e => e.start.getHours()); // subtracting one to have some more space

    return Math.max(0, Math.min(...startHours) - 1);
  }

  getMaxHour() {
    if (!this.props.layers) return DEFAULT_MAX_HOUR;
    let endHours = [].concat(...this.props.layers.map(e => e.events)).map(e => e.end.getHours()); // adding one to have some more space

    return Math.min(Math.max(...endHours) + 1, 24);
  }

  getWeekCalendarStyle() {
    return {
      // extra 1 for the day bar
      gridTemplateRows: `min-content repeat(${this.getMaxHour() - this.getMinHour()}, 1fr)`,
      // extra 1 for the hour bar
      gridTemplateColumns: `min-content repeat(${this.state.numDays}, 1fr)`
    };
  }

  render() {
    return React.createElement("div", {
      style: this.getWeekCalendarStyle(),
      className: "wc-container"
    }, React.createElement(DayBar, {
      numDays: this.state.numDays
    }), React.createElement(HourBar, {
      startHour: this.getMinHour(),
      endHour: this.getMaxHour()
    }), React.createElement(EventCalendar, {
      startHour: this.getMinHour(),
      onEventDrop: this.props.onEventDrop,
      onEventResize: this.props.onEventResize,
      onDoubleClick: this.props.onCalendarClick,
      getEvent: this.props.getEvent,
      endHour: this.getMaxHour(),
      numDays: this.state.numDays,
      layers: this.props.layers
    }));
  }

}
WeekCalendar.propTypes = {
  workWeek: PropTypes.bool.isRequired,
  layers: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    events: PropTypes.arrayOf(PropTypes.object),
    eventClassName: PropTypes.string
  })),
  onCalendarClick: PropTypes.func,
  onEventDrop: PropTypes.func,
  onEventResize: PropTypes.func,
  getEvent: PropTypes.func
};
WeekCalendar.defaultProps = {
  workWeek: true,
  events: []
};